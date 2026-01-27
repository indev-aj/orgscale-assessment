/**
 * *Task
    Provide 3 unique implementations of the following function in TypeScript.
    - Comment on the complexity or efficiency of each function.

    **Input**: `n` - any integer
    Output: return - summation to n, i.e. sum_to_n(5) === 1 + 2 + 3 + 4 + 5 === 15.
 */

/**
 * Returns the sum of integers from 1 to n (inclusive).
 * 
 * Time: O(n)
 * 
 * Space: O(1)
 * @param {number} n - Positive integer upper bound.
 * @returns {number} The computed sum.
 * @throws {RangeError} If n is not a positive integer.
 *
 * @example
 * sumToNA(5); // 15
 */
const sumToNA = (n: number): number => {
    if (!Number.isInteger(n)) throw new RangeError("n must be an integer");
    
    let sum = 0;
    for (let i = 1; i <= n; i++) {
        sum += i;
    }

    return sum;
}

/**
 * Returns the sum of integers from 1 to n (inclusive).
 * 
 * Time: O(1)
 * 
 * Space: O(1)
 * @param {number} n - Positive integer upper bound.
 * @returns {number} The computed sum.
 * @throws {RangeError} If n is not a positive integer.
 *
 * @example
 * sumToNB(5); // 15
 */
const sumToNB = (n: number): number => {
    if (!Number.isInteger(n)) throw new RangeError("n must be an integer");
    if (n <= 0) return 0;

    const sum = (n * (n + 1)) / 2;
    return sum;
}

/**
 * Returns the sum of integers from 1 to n (inclusive).
 * 
 * Time: O(n)
 * 
 * Space: O(n)
 * @param {number} n - Positive integer upper bound.
 * @returns {number} The computed sum.
 * @throws {RangeError} If n is not a positive integer.
 *
 * @example
 * sumToNC(5); // 15
 */
const sumToNC = (n: number): number => {
    if (!Number.isInteger(n)) throw new RangeError("n must be an integer");
    if (n <= 0) return 0;
    return n + sumToNC(n - 1);
}

export { sumToNA, sumToNB, sumToNC };