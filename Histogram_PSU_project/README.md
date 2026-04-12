# histogram Programming Assignment

In this assignment, you are going to implement your own CLI program called `histogram` which utilizes signal handling, file I/O, and continuous input processing in C and Linux/Unix. You'll get experience using signal handlers, file descriptors or streams, byte-level I/O, and error handling.

## Accepting the Assignment

[Click here to accept this assignment](github.com). Once you accept the invitation, GitHub will create a private repository containing the starter files for the assignment. You will also find an accompanying `README.md`, which is essentially this document you are reading, useful for instructions and further details.

## Details

You will be implementing an application called `histogram` which reads bytes from standard input continuously and maintains a histogram of byte value frequencies. The program responds to various signals to output the histogram in different ways (some to STDOUT, others to a file on disk). You can think of this application as a long-standing process that logs how often a byte shows up in an input stream. For example, maybe you want to test how random your `/dev/urandom` entropy engine is; you could pipe its output into the histogram program and periodically signal the process to see how the histogram changes over time. 

### Program Requirements

Your `histogram` program should:

1. **Read bytes continuously**: Read bytes from `stdin` one at a time, maintaining a histogram of byte values seen (0-255)
   - The program should run continuously until EOF on STDIN is encountered or a SIGINT/SIGTERM signal is received
   - Each byte value (0-255) read will update the histrogram counter by 1 (i.e. every byte value should be considered, not just ASCII)

2. **Handle signals**: Respond to the following signals:
   - **SIGUSR1**: Save the current histogram statistics to a file called `histo.out`
   - **SIGINT/SIGTERM**: Save the current histogram statistics to a file called `histo.out` and then exit (either call exit or reraise with a default handler)
   - On **EOF** (when stdin is closed): Output the current histogram to `stdout` ONLY (do not make a `histo.out` file) and exit

3. **Output format**: The histogram output should follow a specific format:
   - For each byte value (0-255), print:
     - The histogram count (right-justified, space for `unsigned long long int` (20 chars))
     - A space
     - The byte value in hex format with `0x` prefix and zero-padding (e.g., `0x00`, `0x0F`, not `0xa` or `0XA`)
     - A space
     - A pipe character `|`
     - For non-zero histogram values: a proportional bar of `#` symbols based on the maximum histogram value (rounded down)
        - Always end with a pipe character `|` and newline
        - The maximum size of the bar is specified by `MAX_BAR_WIDTH = 50`
     - For zero histogram values: just output the pipe `|` and newline (no bar)
   - Example outputs can be found in `tests/outputs` and further details can be found below.

4. **Error handling**: Handle errors appropriately:
   - If there are errors reading from stdin (other than `EINTR`), print an error message to `stderr` and exit with a non-zero exit code
   - Handle `EINTR` errors from signal interruptions by retrying the read operation

### Signal Handling Details

- **SIGUSR1**: When received, the program should save the current histogram to `histo.out` and continue processing
- **SIGINT/SIGTERM**: When received, the program should save the current histogram to `histo.out` and then exit
- **EOF**: When `read()` returns 0 (EOF), the program should output the histogram to `stdout` and exit

**Important Note**: It is generally bad practice to use STDIO functions (like `printf`, `fprintf`, etc.) in signal handlers. However, for this assignment, we guarantee that multiple signals will **not** be sent at or near the same time. Therefore, it is **okay** to use STDIO functions in your signal handlers for this assignment.

You may use either the `signal()` or `sigaction()` system calls to register signal handlers.

### More Output Format Details

Each line of the histogram output should have the following format:

```
                    COUNT 0xXX |[BAR](|)
```

Where:
- `COUNT` is the histogram count for that byte value, right-justified in a 20-character field (for `unsigned long long int`) (check online documentation for how to right-justify with fixed width)
- `0xXX` is the byte value in hexadecimal format with zero-padding (e.g., `0x00`, `0x0A`, `0xFF`) (check online documentation for how to zero pad)
- `|` is a pipe character that always starts the bar section
- `[BAR]` is a proportional bar of `#` symbols (only for non-zero histogram values)
  - The bar length should be calculated as this histograms frequency value normalized to the maximum frequency value found, scaled to the maximum width of the bar (all rounded down)
  - `MAX_BAR_WIDTH` is defined in `histogram.h` as 50
- `|` is a pipe character that always ends the bar section if a non-zero frequency was found.

For example, consider the hisogram of bytes `[0x42, 0x42, 0x42, 0x42, 0x42, 0x44]` (5 byte 0x42 and 1 byte 0x44). The hisogram output would look like:

```
... (truncated)
                   0 0x40 |
                   0 0x41 |
                   5 0x42 |##################################################|
                   0 0x43 |
                   1 0x44 |##########|
                   0 0x45 |
                   0 0x46 |
... (truncated)
```

### Implementation Details

You may use file descriptors (using Linux system calls) or you can use file streams (using Linux system libraries). You may use any of the following functions in your design (but this is not a limited set):

- **syscalls (file descriptors)**
  - `open`/`close`
  - `read`/`write`
- **STDIO (FILE\* streams)**
  - `fopen`/`fclose`
  - `fread`/`fwrite`
  - `fprintf`/`printf`
  - `stdin`/`stdout`/`stderr`
- **signal handling**
  - `signal()` - register signal handlers
  - `sigaction()` - register signal handlers (alternative to `signal()`)
  - `raise()` - send signal to current process
- **error handling**
  - `errno` - error number variable
  - `strerror()` - convert error number to string
  - `EINTR` - error code for interrupted system call

Feel free to look at the man pages for any of these functions to inspect their function signature and use case.

#### Recommended Implementation Approach

A typical implementation approach includes:

1. **Include necessary headers**: Include headers for signal handling, file I/O, and error handling
   - `signal.h` for signal handling
   - `unistd.h` for `read()`/`write()` and `STDIN_FILENO`
   - `stdio.h` for `FILE*` streams, `stdin`, and `stdout` if using streams
   - `errno.h` for error handling

2. **Defining the histogram**: The histogram array is already declared in `histogram.h` as a global array of 256 elements, initialized to zero

3. **Set up signal handlers**: Register handlers for:
   - `SIGUSR1` - dump to file
   - `SIGINT` and `SIGTERM` - dump to file and exit

4. **Main processing loop**:
   - Read bytes from `stdin` one at a time
   - Handle `EINTR` errors by retrying the read
   - Handle EOF by outputting to stdout and exiting
   - Increment the histogram count for each byte value processed

5. **Output function**: Create a function to output the histogram to a file/stream:
   - Calculate the maximum histogram value
   - For each byte value (0-255), output the formatted line
   - Normalize each bar to that of the largest frequency, then scaled to the width of 50 chars (`#`)
   - Check the outputs directory for some examples.

6. **Signal handlers**:
   - `SIGUSR1` handler: Open `histo.out`, write histogram, close file, continue
   - `SIGINT`/`SIGTERM` handler: Open `histo.out`, write histogram, close file, reraise or exit

7. **Error handling**:
   - Check return values from system calls
   - Handle `EINTR` specially (retry the operation)
   - Print error messages to `stderr` when appropriate

## Assignment File Structure

### **histogram.c**

**This is the only file you should be modifying in this assignment.**

This file is a *source* file written in C (due to the `.c` file extension). This file contains a starter implementation with the main function and primer comments. Inside, you will write your own C code to implement the histogram program based on the requirements above. Additionally, we would like you to adhere to good programming practices; i.e. include comments while writing your code. This will help you understand your code long after writing it and will also help others, such as course staff, to be able to read your code and understand your thought process. To encourage the use of comments, a portion of this assignment will be based on whether you have written effective comments (telling us what you are doing in the code, why you write the code in this way, etc.). *Note:* No external libraries may be used unless explicitly stated in the assignment

For example, consider these two samples of code:

```c
// f to c
float convert_to_c(float input) {
    float c = 0; // declare var
    float f = input; // declare input var
    c = (f - 32) * 5 / 9; // do math
    return c; // return result
}
```

```c
// Convert an input float in Fahrenheit (f) to an output float in Celsius (c)
float convert_to_c(float input) {
    float c = 0; // declare the output celsius float
    float f = input; // declare the input fahrenheit float, set it as the input
    c = (f - 32) * 5 / 9; // convert F to C using the conversion formula: C = (F - 32) × 5/9
    return c; // return the celcius result
}
```

While both code snippets do the same thing, they are documented very differently. The latter is much more readable and understandable as to why decisions were made and what the code is doing rather than just describing the code on a surface level. When writing comments, it's not enough to just say "this is what the code does" but instead you should be documenting "why the code is written as it is". Comments should explain your thought process.

### **histogram.h**

**Do not modify this file.**

This header file contains:
- The `hist_int_t` typedef for histogram count values (`unsigned long long int`)
- The global `histogram` array declaration (256 elements, one for each byte value)
- The `MAX_BAR_WIDTH` constant (currently 50)

### **tests/**

This directory contains test inputs and expected outputs for grading:

- **tests/inputs/**: Contains various test input files including:
  - `aaa.in` - Input with repeated 'a' characters
  - `aaab.in` - Input with 'a' and 'b' characters
  - `abc.in` - Input with 'a', 'b', and 'c' characters
  - `empty.in` - Empty file to test edge cases
  - `normaldist.in` - Input with normally distributed byte values
  - `passage.in` - Text passage for realistic testing scenarios
  
- **tests/outputs/**: Contains expected output files:
  - `*.full.out` files - Expected full histogram output for complete input files
  - `*.partial.out` files - Expected partial histogram output for half of the input files

### **grade.py**

You don't need to read this file to finish this assignment, but it's a Python script that runs tests on your compiled program to check for correctness. The script:
- Runs 24 tests total:
  - Tests 1-6: Simple tests (pipe input, send EOF, check stdout)
  - Tests 7-12: Partial file dump tests (send half input, send SIGUSR1, check histo.out against partial.out)
  - Tests 13-18: Signal file dump tests (send full input, send SIGUSR1, check histo.out against full.out)
  - Tests 19-24: Signal termination tests (send full input, send SIGINT/SIGTERM, check histo.out against full.out)
- Compares outputs with expected outputs in `tests/outputs/`
- Calculates your score based on test results (23 points total for correctness)

### **.gitignore**

You don't need to read this file to finish this assignment. 

This file tells git what files or folders it should ignore. Any changes in those files or folders will not be tracked. The content of this file includes the `histogram` executable and `histo.out` files.

### **README.md**

The markdown document you are reading now.

---

## Testing Your Code

When you finish a function or reach a stopping point, you can compile and test your code using the following commands.

### Compiling

In the project directory, run this command in your terminal to compile your code:

```shell
gcc histogram.c -o histogram
```

If your code has no syntax errors, an executable file called `histogram` will appear in your directory. If there are syntax errors, carefully read the errors or warnings to understand what line of code is causing the syntax error.

### Testing / Running

You can test your program yourself with any input you choose:

```shell
# Basic usage - pipe input and get output on EOF
echo "hello" | ./histogram

# Send signal to dump to file (in another terminal or using kill)
./histogram < input.txt &
PID=$!
kill -10 $PID  # Send SIGUSR1 to dump to histo.out
kill -15 $PID  # Send SIGTERM to dump to histo.out and exit

# Test with binary data (get 100 bytes from urandom and send that to your program)
./histogram < /dev/urandom | head -n 100

# Test with file input
./histogram < tests/inputs/aaa.in
```

Do this as many times as you'd like to ensure you are getting proper outputs. You can test signal handling by:
1. Running the program in the background or in one terminal
2. Finding the process ID (PID)
3. Sending signals using `kill -USR1 <PID>`, `kill -INT <PID>`, or `kill -TERM <PID>`

### Running the Test Suite

To test your code and see your proposed grade, run:

```shell
python3 grade.py
```

or 

```shell
chmod +x grade.py
./grade.py
```

This script will:
- Check for the `histogram` executable in the current directory
- Run 24 tests covering:
  - Simple EOF tests (6 tests)
  - Partial file dump tests with SIGUSR1 (6 tests)
  - Full file dump tests with SIGUSR1 (6 tests)
  - Signal termination tests with SIGINT/SIGTERM (6 tests)
- Compare outputs with expected outputs in `tests/outputs/`
- Display detailed test results with pass/fail status
  - If tests pass, you'll see "PASSED" for each test
  - If tests fail, you'll see "FAILED" with diff output showing what differs
- Calculate and display your score (out of 23 points for correctness)

The script assumes there is an executable called `histogram` in your current working directory. Make sure you've compiled your program first using `gcc histogram.c -o histogram`.

---

## Rubric

This assignment is worth 25 points total.

- **Output/Diff Correctness (23 pts)**: Your program must pass all test cases in the grading script. The grade is calculated based on 24 tests, each worth an equal portion of 23 points (approximately 0.96 points per test):
  - **Simple EOF tests (6 tests)**: Tests that pipe input to the program, send EOF, and check stdout output
    - Tests basic histogram functionality
    - Tests EOF handling and stdout output format
  - **Partial file dump tests (6 tests)**: Tests that send half of the input, send SIGUSR1, and check histo.out against partial.out
    - Tests signal handling for SIGUSR1
    - Tests file output format
    - Tests that histogram correctly tracks partial input
    - Tests that histogram does not exit
  - **Full file dump tests (6 tests)**: Tests that send full input, send SIGUSR1, and check histo.out against full.out
    - Tests signal handling for SIGUSR1 with complete input
    - Tests file output format with complete data
    - Tests that histogram does not exit
  - **Signal termination tests (6 tests)**: Tests that send full input, send SIGINT or SIGTERM, and check histo.out against full.out
    - Tests signal handling for SIGINT and SIGTERM
    - Tests that program exits correctly after dumping to file
    - Alternates between SIGINT and SIGTERM signals

- **Comments (1 pts)**: Effective use of comments explaining your thought process and why code is written as it is. Comments should explain the "why" not just the "what".

- **Git Commits (1 pts)**: Regular commits showing your progress (at least 3 commits). Each commit should represent a meaningful milestone in your implementation. *NOTE: * Commit as you work. Push each commit separately and soon after finishing a meaningful chunk of work (e.g., implement a function, fix a bug, add tests) Do not batch-create many tiny/empty commits at the end just to meet the 3 commit-count requirement, those may be treated as non-meaningful and may not count.



For late submissions, please refer to syllabus or Canvas website.

## Turnin

Go to Canvas, start the quiz, and submit a commit ID as a single line in the submission box.