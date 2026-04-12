#!/usr/bin/env python3
"""
Grader for histogram assignment
Runs 24 tests:
- Tests 1-6: Simple tests (pipe input, send EOF, check stdout)
- Tests 7-12: Partial file dump tests (send half input, send SIGUSR1, check histo.out against partial.out)
- Tests 13-18: Signal file dump tests (send full input, send SIGUSR1, check histo.out against full.out)
- Tests 19-24: Signal termination tests (send full input but no EOF, send SIGINT/SIGTERM, check histo.out against full.out)
"""

import os
import sys
import subprocess
import signal
import time
import difflib

# Test configuration
TEST_DIR = "tests"
INPUTS_DIR = os.path.join(TEST_DIR, "inputs")
OUTPUTS_DIR = os.path.join(TEST_DIR, "outputs")
HISTOGRAM_EXEC = "./histogram"
HISTO_OUT_FILE = "histo.out"

# Test files (6 tests)
TEST_FILES = ["aaa", "aaab", "abc", "empty", "normaldist", "passage"]

def read_file(filepath):
    """Read file contents as bytes."""
    try:
        with open(filepath, 'rb') as f:
            return f.read()
    except FileNotFoundError:
        return None

def compare_outputs(actual, expected, test_name):
    """Compare actual and expected outputs, return (match, diff_lines)."""
    if actual == expected:
        return True, []
    
    # Convert to lines for better diff
    actual_lines = actual.decode('utf-8', errors='replace').splitlines(keepends=True)
    expected_lines = expected.decode('utf-8', errors='replace').splitlines(keepends=True)
    
    diff = list(difflib.unified_diff(
        expected_lines,
        actual_lines,
        fromfile=f'expected_{test_name}',
        tofile=f'actual_{test_name}',
        lineterm=''
    ))
    
    return False, diff

def run_simple_test(test_name, test_num):
    """Run a simple test: pipe input, send EOF, check stdout."""
    print(f"Test {test_num}: Simple test - {test_name}")
    
    input_file = os.path.join(INPUTS_DIR, f"{test_name}.in")
    expected_file = os.path.join(OUTPUTS_DIR, f"{test_name}.full.out")
    
    # Read input and expected output
    input_data = read_file(input_file)
    expected_output = read_file(expected_file)
    
    if input_data is None or expected_output is None:
        print(f"  ERROR: Could not read test files for {test_name}")
        return False
    
    # Run histogram program
    try:
        process = subprocess.Popen(
            [HISTOGRAM_EXEC],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        
        # Send input data and close stdin (sends EOF)
        stdout, stderr = process.communicate(input=input_data, timeout=10)
        
        if process.returncode != 0:
            print(f"  FAILED: Program exited with code {process.returncode}")
            if stderr:
                print(f"  STDERR: {stderr.decode('utf-8', errors='replace')}")
            return False
        
        # Compare outputs
        match, diff = compare_outputs(stdout, expected_output, test_name)
        if match:
            print(f"  PASSED")
            return True
        else:
            print(f"  FAILED: Output mismatch")
            if diff:
                print("  DIFF:")
                for line in diff[:20]:  # Show first 20 lines of diff
                    print(f"    {line}", end='')
                if len(diff) > 20:
                    print(f"    ... ({len(diff) - 20} more lines)")
            return False
            
    except subprocess.TimeoutExpired:
        print(f"  FAILED: Program timed out")
        process.kill()
        return False
    except Exception as e:
        print(f"  FAILED: Exception - {e}")
        return False

def run_partial_file_test(test_name, test_num):
    """Run a partial file dump test: send half input, send SIGUSR1, check histo.out against partial.out."""
    print(f"Test {test_num}: Partial file dump test - {test_name}")
    
    input_file = os.path.join(INPUTS_DIR, f"{test_name}.in")
    expected_file = os.path.join(OUTPUTS_DIR, f"{test_name}.partial.out")
    
    # Read input and expected output
    input_data = read_file(input_file)
    expected_output = read_file(expected_file)
    
    if input_data is None or expected_output is None:
        print(f"  ERROR: Could not read test files for {test_name}")
        return False
    
    # Take half of the input data
    half_length = len(input_data) // 2
    partial_input = input_data[:half_length]
    
    # Remove histo.out if it exists
    if os.path.exists(HISTO_OUT_FILE):
        os.remove(HISTO_OUT_FILE)
    
    # Run histogram program
    try:
        process = subprocess.Popen(
            [HISTOGRAM_EXEC],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        
        # Send half of input data
        process.stdin.write(partial_input)
        process.stdin.flush()
        
        # Give it a moment to process
        time.sleep(0.1)
        
        # Send SIGUSR1 signal
        process.send_signal(signal.SIGUSR1)
        
        # Give it a moment to write the file
        time.sleep(0.1)
        
        # Check if process is still running (SIGUSR1 should NOT cause exit)
        if process.poll() is not None:
            print(f"  FAILED: Process exited on SIGUSR1 (should continue running)")
            return False
        
        # Kill the process
        process.kill()
        process.wait(timeout=2)
        
        # Read the output file
        actual_output = read_file(HISTO_OUT_FILE)
        
        if actual_output is None:
            print(f"  FAILED: Could not read {HISTO_OUT_FILE}")
            return False
        
        # Compare outputs
        match, diff = compare_outputs(actual_output, expected_output, test_name)
        if match:
            print(f"  PASSED")
            return True
        else:
            print(f"  FAILED: Output mismatch")
            if diff:
                print("  DIFF:")
                for line in diff[:20]:  # Show first 20 lines of diff
                    print(f"    {line}", end='')
                if len(diff) > 20:
                    print(f"    ... ({len(diff) - 20} more lines)")
            return False
            
    except Exception as e:
        print(f"  FAILED: Exception - {e}")
        if 'process' in locals():
            try:
                process.kill()
                process.wait()
            except:
                pass
        return False

def run_signal_file_test(test_name, test_num):
    """Run a signal file dump test: send input, send SIGUSR1, check histo.out."""
    print(f"Test {test_num}: Signal file dump test - {test_name}")
    
    input_file = os.path.join(INPUTS_DIR, f"{test_name}.in")
    expected_file = os.path.join(OUTPUTS_DIR, f"{test_name}.full.out")
    
    # Read input and expected output
    input_data = read_file(input_file)
    expected_output = read_file(expected_file)
    
    if input_data is None or expected_output is None:
        print(f"  ERROR: Could not read test files for {test_name}")
        return False
    
    # Remove histo.out if it exists
    if os.path.exists(HISTO_OUT_FILE):
        os.remove(HISTO_OUT_FILE)
    
    # Run histogram program
    try:
        process = subprocess.Popen(
            [HISTOGRAM_EXEC],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        
        # Send input data
        process.stdin.write(input_data)
        process.stdin.flush()
        
        # Give it a moment to process
        time.sleep(0.1)
        
        # Send SIGUSR1 signal
        process.send_signal(signal.SIGUSR1)
        
        # Give it a moment to write the file
        time.sleep(0.1)
        
        # Check if process is still running (SIGUSR1 should NOT cause exit)
        if process.poll() is not None:
            print(f"  FAILED: Process exited on SIGUSR1 (should continue running)")
            return False
        
        # Kill the process
        process.kill()
        process.wait(timeout=2)
        
        # Read the output file
        actual_output = read_file(HISTO_OUT_FILE)
        
        if actual_output is None:
            print(f"  FAILED: Could not read {HISTO_OUT_FILE}")
            return False
        
        # Compare outputs
        match, diff = compare_outputs(actual_output, expected_output, test_name)
        if match:
            print(f"  PASSED")
            return True
        else:
            print(f"  FAILED: Output mismatch")
            if diff:
                print("  DIFF:")
                for line in diff[:20]:  # Show first 20 lines of diff
                    print(f"    {line}", end='')
                if len(diff) > 20:
                    print(f"    ... ({len(diff) - 20} more lines)")
            return False
            
    except Exception as e:
        print(f"  FAILED: Exception - {e}")
        if 'process' in locals():
            try:
                process.kill()
            except:
                pass
        return False

def run_signal_termination_test(test_name, test_num, sig):
    """Run a signal termination test: send full input, send SIGINT/SIGTERM, check histo.out file."""
    signal_name = "SIGINT" if sig == signal.SIGINT else "SIGTERM"
    print(f"Test {test_num}: Signal termination test ({signal_name}) - {test_name}")
    
    input_file = os.path.join(INPUTS_DIR, f"{test_name}.in")
    expected_file = os.path.join(OUTPUTS_DIR, f"{test_name}.full.out")
    
    # Read input and expected output
    input_data = read_file(input_file)
    expected_output = read_file(expected_file)
    
    if input_data is None or expected_output is None:
        print(f"  ERROR: Could not read test files for {test_name}")
        return False
    
    # Remove histo.out if it exists
    if os.path.exists(HISTO_OUT_FILE):
        os.remove(HISTO_OUT_FILE)
    
    # Run histogram program
    try:
        process = subprocess.Popen(
            [HISTOGRAM_EXEC],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        
        # Send input data
        process.stdin.write(input_data)
        process.stdin.flush()
        
        # Give it a moment to process
        time.sleep(0.1)
        
        # Send SIGINT or SIGTERM signal (should dump to file and exit)
        process.send_signal(sig)
        
        # Give it a moment to write the file
        time.sleep(0.1)
        
        # Wait for process to finish (signal handler should cause exit)
        try:
            process.wait(timeout=2)
        except subprocess.TimeoutExpired:
            # If process didn't exit, kill it
            process.kill()
            process.wait(timeout=2)
            print(f"  FAILED: Process did not exit")
            return False

        
        # Read the output file
        actual_output = read_file(HISTO_OUT_FILE)
        
        if actual_output is None:
            print(f"  FAILED: Could not read {HISTO_OUT_FILE}")
            return False
        
        # Compare outputs
        match, diff = compare_outputs(actual_output, expected_output, test_name)
        if match:
            print(f"  PASSED")
            return True
        else:
            print(f"  FAILED: Output mismatch")
            if diff:
                print("  DIFF:")
                for line in diff[:20]:  # Show first 20 lines of diff
                    print(f"    {line}", end='')
                if len(diff) > 20:
                    print(f"    ... ({len(diff) - 20} more lines)")
            return False
    
    except Exception as e:
        print(f"  FAILED: Exception - {e}")
        if 'process' in locals():
            try:
                process.kill()
            except:
                pass
        return False

def main():
    """Run all 24 tests."""
    # Check if histogram executable exists
    if not os.path.exists(HISTOGRAM_EXEC):
        print(f"ERROR: {HISTOGRAM_EXEC} not found. Please compile the histogram program first.")
        sys.exit(1)
    
    # Check if test directories exist
    if not os.path.exists(INPUTS_DIR) or not os.path.exists(OUTPUTS_DIR):
        print(f"ERROR: Test directories not found. Expected {INPUTS_DIR} and {OUTPUTS_DIR}")
        sys.exit(1)
    
    # Test configuration
    TOTAL_POINTS = 23.0
    NUM_TESTS = 24
    POINTS_PER_TEST = TOTAL_POINTS / NUM_TESTS
    
    # Test names for display
    test_names = []
    for i in range(1, 7):
        test_names.append(f"Simple test {i}")
    for i in range(7, 13):
        test_names.append(f"Partial file dump test {i}")
    for i in range(13, 19):
        test_names.append(f"Signal file dump test {i}")
    for i in range(19, 25):
        sig_name = "SIGINT" if (i - 19) % 2 == 0 else "SIGTERM"
        test_names.append(f"Signal termination test ({sig_name}) {i}")
    
    # Track test results
    test_results = []
    passed = 0
    failed = 0
    
    # Tests 1-6: Simple tests
    print("=" * 60)
    print("Simple Tests (1-6): Pipe input, send EOF, check stdout")
    print("=" * 60)
    for i, test_name in enumerate(TEST_FILES, 1):
        result = run_simple_test(test_name, i)
        test_results.append(result)
        if result:
            passed += 1
        else:
            failed += 1
        print()
    
    # Tests 7-12: Partial file dump tests
    print("=" * 60)
    print("Partial File Dump Tests (7-12): Send half input, send SIGUSR1, check histo.out against partial.out")
    print("=" * 60)
    for i, test_name in enumerate(TEST_FILES, 7):
        result = run_partial_file_test(test_name, i)
        test_results.append(result)
        if result:
            passed += 1
        else:
            failed += 1
        print()
    
    # Tests 13-18: Signal file dump tests
    print("=" * 60)
    print("Signal File Dump Tests (13-18): Send input, send SIGUSR1, check histo.out")
    print("=" * 60)
    for i, test_name in enumerate(TEST_FILES, 13):
        result = run_signal_file_test(test_name, i)
        test_results.append(result)
        if result:
            passed += 1
        else:
            failed += 1
        print()
    
    # Tests 19-24: Signal termination tests
    print("=" * 60)
    print("Signal Termination Tests (19-24): Send full input, send SIGINT/SIGTERM, check histo.out")
    print("=" * 60)
    for i, test_name in enumerate(TEST_FILES, 19):
        # Alternate between SIGINT and SIGTERM
        sig = signal.SIGINT if (i - 19) % 2 == 0 else signal.SIGTERM
        result = run_signal_termination_test(test_name, i, sig)
        test_results.append(result)
        if result:
            passed += 1
        else:
            failed += 1
        print()
    
    # Summary
    print("-------------------Summary-------------------")
    print(f"Total tests: {passed + failed}")
    print(f"Total tests passed: {passed}")
    print(f"Total tests failed: {failed}")
    print("--------------------------------")
    
    # Calculate points
    total_points = 0.0
    for i, result in enumerate(test_results):
        if result:
            total_points += POINTS_PER_TEST
            print(f"Test {i+1} ({test_names[i]}) passed")
        else:
            print(f"Test {i+1} ({test_names[i]}) failed")
    
    print(f"Total tests passed: {passed}")
    print(f"points for correctness: {total_points:.2f}/{TOTAL_POINTS:.0f}, please read the document for more details.")

if __name__ == "__main__":
    main()