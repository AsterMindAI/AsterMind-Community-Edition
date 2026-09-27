// Multi-domain labeled evaluation set for reranking.
// Graded relevance: 2 = fully answers, 1 = partially relevant, 0 = irrelevant.
// Designed to be FAIR, not rigged: includes cases where exact lexical match IS
// the right answer, cases where the answer uses different words than the query
// (semantic gap), and lexically-similar distractors that are actually irrelevant.

export type Chunk = { heading: string; content: string; rich?: string };
export type EvalCase = {
  id: string;
  domain: string;
  query: string;
  chunks: Chunk[];
  // relevance label per chunk index
  labels: number[];
};

export const EVAL: EvalCase[] = [
  {
    id: "cook-1",
    domain: "cooking",
    query: "how do I stop pasta from sticking together",
    chunks: [
      { heading: "Boiling pasta", content: "Use plenty of water and stir the noodles occasionally in the first two minutes so they do not clump; salt the water generously." },
      { heading: "Draining", content: "A pinch of oil in the pot does little; keeping the strands moving while they cook is what prevents them from adhering to each other." },
      { heading: "Pasta shapes", content: "Penne, fusilli, and rigatoni hold chunky sauces better than thin spaghetti or angel hair." },
      { heading: "Sticky rice", content: "For sushi you actually want the grains to cling, so rinse less and use short-grain rice." },
      { heading: "Reheating leftovers", content: "Cold cooked pasta can be loosened with a splash of warm water in the microwave." },
      { heading: "Sauce pairing", content: "Cream sauces coat long noodles well while oil-based sauces suit sturdier shapes." },
    ],
    labels: [2, 2, 0, 0, 1, 0],
  },
  {
    id: "cook-2",
    domain: "cooking",
    query: "safe internal temperature for chicken",
    chunks: [
      { heading: "Poultry doneness", content: "Cook chicken until the thickest part reaches 165 degrees Fahrenheit (74 Celsius) measured with a probe thermometer." },
      { heading: "Resting meat", content: "Let roasts rest ten minutes so juices redistribute before carving." },
      { heading: "Beef temperatures", content: "Medium-rare steak is around 130 to 135 degrees; well done is 160 and above." },
      { heading: "Thermometer tips", content: "Insert the probe into the deepest muscle, avoiding bone, to read poultry accurately." },
      { heading: "Marinades", content: "Acidic marinades tenderize the surface of chicken but do not change cooking temperature." },
    ],
    labels: [2, 0, 0, 1, 0],
  },
  {
    id: "med-1",
    domain: "health",
    query: "why do I feel dizzy when I stand up quickly",
    chunks: [
      { heading: "Orthostatic hypotension", content: "A rapid drop in blood pressure on standing reduces blood flow to the brain, causing brief lightheadedness; rising slowly helps." },
      { heading: "Dehydration", content: "Low fluid volume makes the pressure drop on standing more pronounced, so staying hydrated reduces the spinning feeling." },
      { heading: "Inner ear vertigo", content: "BPPV causes a spinning sensation triggered by head position changes, unrelated to blood pressure." },
      { heading: "Migraine aura", content: "Some people see flashing lights before a headache begins." },
      { heading: "Blood pressure basics", content: "Systolic over diastolic; normal is around 120 over 80 millimeters of mercury." },
    ],
    labels: [2, 2, 1, 0, 1],
  },
  {
    id: "med-2",
    domain: "health",
    query: "ibuprofen versus acetaminophen for a fever",
    chunks: [
      { heading: "Antipyretics", content: "Both ibuprofen and acetaminophen lower fever; ibuprofen also reduces inflammation while acetaminophen is gentler on the stomach." },
      { heading: "Dosing safety", content: "Do not exceed the labeled daily maximum of acetaminophen because liver damage can result." },
      { heading: "Aspirin warning", content: "Aspirin should not be given to children with viral illness due to Reye syndrome risk." },
      { heading: "Cold remedies", content: "Decongestants relieve a stuffy nose but do not treat the underlying infection." },
      { heading: "Hydration during fever", content: "Fever increases fluid loss, so drink more water than usual." },
    ],
    labels: [2, 1, 0, 0, 1],
  },
  {
    id: "fin-1",
    domain: "finance",
    query: "difference between a Roth and a traditional IRA",
    chunks: [
      { heading: "Roth vs traditional", content: "Traditional IRA contributions are pre-tax and withdrawals are taxed; Roth contributions are after-tax and qualified withdrawals are tax-free." },
      { heading: "Contribution limits", content: "Annual IRA contribution caps apply across both account types combined." },
      { heading: "Required distributions", content: "Traditional IRAs force withdrawals at a certain age; Roth IRAs have no required minimum distributions for the original owner." },
      { heading: "401k basics", content: "An employer plan often includes matching contributions up to a percentage of salary." },
      { heading: "Brokerage accounts", content: "A taxable brokerage account has no contribution limit but no tax advantage either." },
    ],
    labels: [2, 1, 2, 0, 0],
  },
  {
    id: "fin-2",
    domain: "finance",
    query: "what causes inflation to rise",
    chunks: [
      { heading: "Demand-pull inflation", content: "When spending outpaces the economy's capacity to produce goods, prices climb across the board." },
      { heading: "Cost-push pressure", content: "Rising input costs such as energy or wages push producers to raise prices, lifting the overall price level." },
      { heading: "Money supply", content: "Rapid expansion of the money supply can erode purchasing power over time." },
      { heading: "Deflation", content: "A sustained fall in prices can discourage spending and stall growth." },
      { heading: "Stock dividends", content: "Companies distribute part of profits to shareholders as dividends." },
    ],
    labels: [2, 2, 1, 0, 0],
  },
  {
    id: "prog-1",
    domain: "programming",
    query: "how to reverse a linked list in place",
    chunks: [
      { heading: "Iterative reversal", content: "Walk the list once, repointing each node's next pointer to the previous node using three pointers: prev, curr, and next." },
      { heading: "Recursive approach", content: "Recurse to the tail, then unwind, flipping each link so the last node becomes the head." },
      { heading: "Array reversal", content: "Swap elements from both ends toward the middle; this is unrelated to node pointers." },
      { heading: "Detecting cycles", content: "Floyd's tortoise and hare finds a loop with two pointers moving at different speeds." },
      { heading: "Linked list basics", content: "Each node stores a value and a reference to the following node." },
    ],
    labels: [2, 2, 0, 0, 1],
  },
  {
    id: "prog-2",
    domain: "programming",
    query: "python list comprehension to filter even numbers",
    chunks: [
      { heading: "Comprehension filter", content: "Write [x for x in nums if x % 2 == 0] to keep only the even values from a list." },
      { heading: "Map and filter", content: "list(filter(lambda x: x % 2 == 0, nums)) achieves the same result in a functional style." },
      { heading: "Dictionary comprehension", content: "{k: v for k, v in items} builds a dict from pairs, a different construct." },
      { heading: "Generators", content: "Replacing brackets with parentheses yields a lazy generator instead of a materialized list." },
      { heading: "Sorting numbers", content: "sorted(nums) returns a new ascending list without mutating the original." },
    ],
    labels: [2, 2, 0, 1, 0],
  },
  {
    id: "geo-1",
    domain: "geography",
    query: "which river is the longest in the world",
    chunks: [
      { heading: "Nile and Amazon", content: "The Nile in Africa is traditionally cited as the longest river; some studies argue the Amazon is longer depending on how the source is measured." },
      { heading: "Amazon basin", content: "The Amazon carries by far the greatest volume of water of any river." },
      { heading: "Mississippi system", content: "The Mississippi-Missouri is the longest river system in North America." },
      { heading: "Mountain ranges", content: "The Andes run along the western edge of South America." },
      { heading: "Great lakes", content: "Lake Superior holds the most surface area of the North American great lakes." },
    ],
    labels: [2, 1, 0, 0, 0],
  },
  {
    id: "geo-2",
    domain: "geography",
    query: "capital city of Australia",
    chunks: [
      { heading: "Canberra", content: "The seat of government is Canberra, a planned city chosen as a compromise between Sydney and Melbourne." },
      { heading: "Sydney", content: "Sydney is the largest city and a common assumption for the capital, but it is not the seat of government." },
      { heading: "Melbourne", content: "Melbourne briefly served as the interim capital before Canberra was built." },
      { heading: "Australian geography", content: "The continent is known for its arid interior called the outback." },
      { heading: "New Zealand", content: "Wellington is the capital of neighboring New Zealand." },
    ],
    labels: [2, 0, 1, 0, 0],
  },
  {
    id: "cook-3",
    domain: "cooking",
    query: "substitute for eggs when baking a cake",
    chunks: [
      { heading: "Egg replacers", content: "Mashed banana, unsweetened applesauce, or a flax-and-water gel can bind and add moisture in place of eggs in cakes." },
      { heading: "Leavening", content: "A little extra baking powder helps replace the lift that beaten eggs would provide." },
      { heading: "Buttercream", content: "Frosting recipes rarely need eggs at all, relying on butter and sugar." },
      { heading: "Egg wash", content: "Brushing beaten egg on pastry gives a golden shine, a surface finish not a structural role." },
      { heading: "Meringue", content: "Whipped egg whites create airy peaks and cannot be easily substituted." },
    ],
    labels: [2, 1, 0, 0, 0],
  },
  {
    id: "prog-3",
    domain: "programming",
    query: "prevent SQL injection in web queries",
    chunks: [
      { heading: "Parameterized queries", content: "Use prepared statements with bound parameters so user input is never concatenated directly into the SQL string." },
      { heading: "Input validation", content: "Validate and escape untrusted input as a defense in depth, though it is not a substitute for parameterization." },
      { heading: "ORM safety", content: "Most object-relational mappers parameterize queries for you, reducing the risk of injection." },
      { heading: "XSS attacks", content: "Cross-site scripting injects scripts into pages and is a separate class of vulnerability." },
      { heading: "Password hashing", content: "Store credentials with a slow salted hash such as bcrypt." },
    ],
    labels: [2, 1, 2, 0, 0],
  },
];
