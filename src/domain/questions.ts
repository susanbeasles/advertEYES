export type Question = {
    id: string;
    category: string;
    difficulty: number;
    prompt: string;
    visual: string;
    alt: string;
    choices: string[];
    answer: number;
    explanation: string;
    rights: string;
};
const raw: [
    string,
    string,
    string,
    string,
    string[],
    number,
    string
][] = [
    ['SHAPES', 'How many sides?', '⬡', 'A regular hexagon.', ['Five', 'Six', 'Seven', 'Eight'], 1, 'A hexagon has six sides.'],
    ['NATURE', 'Which one is a mammal?', '🐬  🐟  🦈  🐙', 'Dolphin, fish, shark and octopus.', ['Dolphin', 'Salmon', 'Shark', 'Octopus'], 0, 'Dolphins breathe air and nurse their young.'],
    ['NUMBERS', 'Complete the pattern.', '2  4  6  ?', 'Two, four, six, missing number.', ['7', '10', '8', '12'], 2, 'Each term increases by two.'],
    ['SPACE', 'Our home star?', '☀', 'A sun with rays.', ['Sirius', 'Polaris', 'Vega', 'The Sun'], 3, 'The Sun is the star at the center of our solar system.'],
    ['COLOR', 'Light: red + blue = ?', 'R + B', 'Red light plus blue light.', ['Yellow', 'Magenta', 'Green', 'White'], 1, 'In additive color mixing, red and blue light make magenta.'],
    ['GEOMETRY', 'Name this angle.', '90°', 'An angle labeled ninety degrees.', ['Acute', 'Obtuse', 'Right', 'Straight'], 2, 'A right angle measures exactly 90 degrees.'],
    ['MUSIC', 'What does this symbol raise?', '♯', 'A musical sharp symbol.', ['Pitch', 'Volume', 'Tempo', 'Duration'], 0, 'A sharp raises a note by one semitone.'],
    ['SCIENCE', 'Which state fills its container?', '·  ·    ·\n   ·    ·', 'Widely spaced particles.', ['Solid', 'Crystal', 'Ice', 'Gas'], 3, 'A gas expands to fill its available container.'],
    ['NUMBERS', 'Complete the sequence.', '1  1  2  3  5  ?', 'One, one, two, three, five, missing.', ['6', '7', '8', '10'], 2, 'Each Fibonacci term is the sum of the two preceding terms.'],
    ['EARTH', 'Which layer lies below the crust?', 'CRUST\n─────\n   ?', 'Crust above an unknown layer.', ['Outer core', 'Mantle', 'Inner core', 'Atmosphere'], 1, 'The mantle is directly beneath Earth’s crust.'],
    ['BIOLOGY', 'Which pair belongs in DNA?', 'A ↔ ?', 'The DNA base A paired with an unknown base.', ['U', 'G', 'C', 'T'], 3, 'In DNA, adenine pairs with thymine.'],
    ['LOGIC', 'If all A are B, which must hold?', 'A ⊂ B', 'Set A is entirely inside set B.', ['Every A is B', 'Every B is A', 'No A is B', 'A equals B'], 0, 'Containment guarantees that each member of A is also in B.'],
    ['CHEMISTRY', 'This symbol represents…', 'Na', 'The chemical symbol Na.', ['Nitrogen', 'Nickel', 'Sodium', 'Neon'], 2, 'Na is sodium, from the Latin natrium.'],
    ['GEOMETRY', 'Sum of the interior angles?', '△', 'A triangle in Euclidean geometry.', ['90°', '180°', '270°', '360°'], 1, 'The interior angles of a Euclidean triangle total 180 degrees.'],
    ['PHYSICS', 'Which way does the force act?', '+   →←   −', 'A positive and negative electric charge.', ['Apart', 'Up', 'No force', 'Together'], 3, 'Opposite electric charges attract.'],
    ['NUMBER THEORY', 'Which is prime?', '21 · 27 · 29 · 33', 'Twenty-one, twenty-seven, twenty-nine, thirty-three.', ['21', '27', '29', '33'], 2, '29 has no positive divisors other than one and itself.'],
    ['BIOLOGY', 'Which organelle makes most ATP?', 'ATP ↑', 'ATP production in an oxygen-using eukaryotic cell.', ['Mitochondrion', 'Nucleus', 'Golgi body', 'Lysosome'], 0, 'Mitochondria produce most ATP during aerobic cellular respiration.'],
    ['PROBABILITY', 'Two fair coins: exactly one head?', 'H/T × H/T', 'Two independent fair coin tosses.', ['¼', '½', '¾', '1'], 1, 'HT and TH are two of the four equally likely outcomes.'],
    ['ASTRONOMY', 'A redshift usually means…', 'λ → longer', 'Light wavelength shifts longer.', ['Hotter surface', 'Closer orbit', 'More mass', 'Moving away'], 3, 'A Doppler redshift indicates recession along our line of sight.'],
    ['ALGEBRA', 'Solve for x.', '2ˣ = 32', 'Two to the power x equals thirty-two.', ['4', '6', '5', '8'], 2, 'Two multiplied by itself five times equals 32.'],
    ['CHEMISTRY', 'Which geometry does methane have?', 'CH₄', 'Methane, CH four.', ['Tetrahedral', 'Square planar', 'Linear', 'Trigonal planar'], 0, 'Four bonding pairs around carbon arrange tetrahedrally.'],
    ['LOGIC', 'Choose the contrapositive.', 'P ⇒ Q', 'If P then Q.', ['Q ⇒ P', '¬Q ⇒ ¬P', '¬P ⇒ ¬Q', 'P ⇒ ¬Q'], 1, 'An implication is logically equivalent to its contrapositive: if not Q, then not P.'],
    ['PHYSICS', 'Double speed. Kinetic energy becomes…', 'Eₖ = ½mv²', 'Kinetic energy equals one half mass times speed squared.', ['2×', '½×', '8×', '4×'], 3, 'Kinetic energy is proportional to the square of speed, so doubling gives four times.'],
    ['NUMBERS', 'Convert binary to decimal.', '101101₂', 'Binary one zero one one zero one.', ['41', '43', '45', '47'], 2, '32 + 8 + 4 + 1 = 45.'],
    ['CALCULUS', 'Derivative of this function?', 'f(x) = x³', 'f of x equals x cubed.', ['3x²', 'x²', '3x', 'x⁴/4'], 0, 'The power rule gives the derivative of x cubed as 3x squared.'],
    ['GEOMETRY', 'Euler characteristic of a sphere?', 'V − E + F', 'Vertices minus edges plus faces, for a convex polyhedron.', ['0', '2', '1', '4'], 1, 'A convex polyhedron is topologically a sphere and has Euler characteristic two.'],
    ['CHEMISTRY', 'Which has the largest atomic radius?', 'Li   Na   K   Rb', 'Lithium, sodium, potassium, rubidium.', ['Lithium', 'Sodium', 'Potassium', 'Rubidium'], 3, 'Atomic radius generally increases down group 1; rubidium is lowest here.'],
    ['COMBINATORICS', 'Choose 3 from 7. Order irrelevant.', '⁷C₃', 'Seven choose three.', ['21', '42', '35', '210'], 2, '7! divided by 3!4! gives 35 distinct groups.'],
    ['LINEAR ALGEBRA', 'Determinant of this matrix?', '[ 2  3 ]\n[ 1  4 ]', 'A two by two matrix: first row two, three; second row one, four.', ['5', '8', '11', '−5'], 0, 'For a 2 by 2 matrix, ad minus bc gives 8 minus 3, or 5.'],
    ['PROBABILITY', 'Expected rolls until first six?', 'P(6) = ⅙', 'Independent rolls of a fair six-sided die.', ['3', '6', '12', '36'], 1, 'A geometric distribution with success probability one sixth has expectation six.'],
];
export const questions: Question[] = raw.map((r, i) => ({ id: `q${i + 1}`, category: r[0], prompt: r[1], visual: r[2], alt: r[3], choices: r[4], answer: r[5], explanation: r[6], difficulty: Math.floor(i / 6) + 1, rights: 'Original text and typographic diagrams; uncalibrated demo fixture.' }));
