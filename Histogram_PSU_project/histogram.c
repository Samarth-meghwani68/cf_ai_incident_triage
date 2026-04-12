#include "histogram.h"

// These function prototypes / definitions are suggestions but not required to implement.
// hist_int_t get_max_count(void)
// void output_histogram(FILE* destination_stream)
// void usr1_handler/exit_handler/signal_handler(int signum)

// Note: It is bad practice to use STDIO in signal handlers. 
// For this assignment however, I am guaranteeing that multiple signals will **not** be sent at or near the same time, thus it is __okay__ to use STDIO in your signal handlers.
// That is to say, feel free to use printf, fprintf, etc. in your signal handlers.
// Challenge: For the astute, try to implement the histogram program where your signal handlers have only 1 line of code (setting a global variable/flag). Even better if you use sigaction instead of signal.

static hist_int_t get_max_count(void) {
    hist_int_t max_count = 0;

    for (int i = 0; i < 256; i++) {
        if (histogram[i] > max_count) {
            max_count = histogram[i];
        }
    }

    return max_count;
}

static void output_histogram(FILE *destination_stream) {
    hist_int_t max_count = get_max_count();

    for (int i = 0; i < 256; i++) {
        fprintf(destination_stream, "%20llu 0x%02X |", histogram[i], i);

        if (histogram[i] != 0 && max_count != 0) {
            int bar_width = (int)((histogram[i] * MAX_BAR_WIDTH) / max_count);

            for (int j = 0; j < bar_width; j++) {
                fputc('#', destination_stream);
            }

            fputc('|', destination_stream);
        }

        fputc('\n', destination_stream);
    }

    fflush(destination_stream);
}

static void write_histogram_to_file(void) {
    FILE *output_file = fopen("histo.out", "w");
    if (output_file == NULL) {
        fprintf(stderr, "Error opening histo.out: %s\n", strerror(errno));
        return;
    }

    output_histogram(output_file);

    if (fclose(output_file) != 0) {
        fprintf(stderr, "Error closing histo.out: %s\n", strerror(errno));
    }
}

static void usr1_handler(int signum) {
    (void)signum;
    write_histogram_to_file();
}

static void exit_handler(int signum) {
    (void)signum;
    write_histogram_to_file();
    exit(0);
}


int main(void) {
    if (signal(SIGUSR1, usr1_handler) == SIG_ERR) {
        fprintf(stderr, "Error registering SIGUSR1 handler: %s\n", strerror(errno));
        return 1;
    }

    if (signal(SIGINT, exit_handler) == SIG_ERR) {
        fprintf(stderr, "Error registering SIGINT handler: %s\n", strerror(errno));
        return 1;
    }

    if (signal(SIGTERM, exit_handler) == SIG_ERR) {
        fprintf(stderr, "Error registering SIGTERM handler: %s\n", strerror(errno));
        return 1;
    }

    unsigned char byte = 0;
    while (1) {
        ssize_t bytes_read = read(STDIN_FILENO, &byte, 1);

        if (bytes_read > 0) {
            histogram[byte]++;
            continue;
        }

        if (bytes_read == 0) {
            output_histogram(stdout);
            return 0;
        }

        if (errno == EINTR) {
            continue;
        }

        fprintf(stderr, "Error reading from stdin: %s\n", strerror(errno));
        return 1;
    }
}