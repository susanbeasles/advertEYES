# Stronger final-track candidates — proposal only

These ten candidates are NOT in the running bank. Preserve the source/key-checked playable bank as World Tour v1. Candidates emphasize compact structural reasoning rather than long calculations or obscure wording. They still need independent review and actual 15-second human trials. There is no claim that these achieve elite discrimination or strict difficulty ordering. This proposal leans mathematical; a broader domain-expert content mix should be selected deliberately before production.

1. How many 5-bit strings have even parity?
   A 8 · B 16 · C 24 · D 32. Answer B. The first four bits are free; the fifth is fixed by parity: 2^4=16.
2. A uniform random permutation of five items has how many fixed points on average?
   A 0 · B 1 · C 2.5 · D 5. Answer B. Each item has 1/5 chance of being fixed; sum five indicators to get one.
3. For invertible matrices A and B, which equals (AB)^−1?
   A A^−1B^−1 · B B^−1A^−1 · C A^−1+B^−1 · D AB. Answer B. AB times B^−1A^−1 collapses to the identity. Matrix order matters.
4. For every prime p greater than 3, which number divides p²−1?
   A 16 · B 18 · C 24 · D 25. Answer C. Adjacent even numbers p−1,p+1 supply a factor of 8; one is divisible by 3. Counterexamples reject the other choices.
5. Independent uniform x,y in [0,1]: probability max(x,y) < 1/2?
   A 1/4 · B 1/2 · C 3/4 · D 1/8. Answer A. Both must be below 1/2, so multiply 1/2 by 1/2.
6. A fair coin is tossed until two consecutive heads. Expected tosses?
   A 4 · B 5 · C 6 · D 8. Answer C. If E is the initial expectation and H follows one head, E=1+E/2+H/2 and H=1+E/2, giving E=6. Pilot especially carefully: derivation may exceed 15 seconds without prior fluency.
7. A connected planar embedding has six vertices and twelve edges. Faces, including outside?
   A 6 · B 7 · C 8 · D 9. Answer C. Euler’s relation V−E+F=2 gives F=8. The connected planar assumption is essential.
8. Square the real matrix with rows [0,−1] and [1,0].
   A I · B −I · C 0 · D The same matrix. Answer B. It is a 90-degree rotation; twice gives 180 degrees, or negative identity.
9. A 2×2 matrix has eigenvalues i and −i. Its determinant?
   A −1 · B 0 · C 1 · D i. Answer C. The determinant is their product: i×(−i)=1.
10. P(A)=1/3, P(B|A)=1, P(B|not A)=1/4. What is P(A|B)?
    A 1/3 · B 1/2 · C 2/3 · D 3/4. Answer C. P(B)=1/3+(2/3)(1/4)=1/2; divide 1/3 by 1/2 to obtain 2/3. Pilot especially carefully for the 15-second budget.

Evidence basis: explicit mathematical derivations above, not empirical population difficulty. If these are accepted, shuffle choice positions with the versioned permutation step, freeze a new bank version, and re-run key, timing, ambiguity, accessibility and replay checks. Independent uniform blind guessing remains 1/4 per question regardless of wording or sophistication.
