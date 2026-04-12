#ifndef HISTOGRAM_H
#define HISTOGRAM_H

// Useful typedef for the largest histogram value type we can expect
typedef unsigned long long int hist_int_t;

// Global histogram array (256 elements for byte values 0-255)
hist_int_t histogram[256] = {0};

const int MAX_BAR_WIDTH = 50;

#endif