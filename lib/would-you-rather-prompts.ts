import type { Word } from "./words";

export type Dilemma = { a: Word; b: Word };

export type DilemmaPack = {
  id: string;
  name: string;
  emoji: string;
  items: Dilemma[];
};

/** Each pair finishes "Would you rather…". Both sides should be fun to pick, never gross or scary. */
export const DILEMMA_PACKS: DilemmaPack[] = [
  {
    id: "silly",
    name: "Silly",
    emoji: "🤪",
    items: [
      { a: { text: "have a tail", emoji: "🐒" }, b: { text: "have wings", emoji: "🪽" } },
      { a: { text: "talk like a pirate forever", emoji: "🏴‍☠️" }, b: { text: "sing everything you say", emoji: "🎤" } },
      { a: { text: "have spaghetti for hair", emoji: "🍝" }, b: { text: "have marshmallows for fingers", emoji: "☁️" } },
      { a: { text: "bounce everywhere like a kangaroo", emoji: "🦘" }, b: { text: "waddle everywhere like a penguin", emoji: "🐧" } },
      { a: { text: "sneeze glitter", emoji: "✨" }, b: { text: "burp bubbles", emoji: "🫧" } },
      { a: { text: "have a nose that honks", emoji: "📯" }, b: { text: "have ears that light up", emoji: "💡" } },
      { a: { text: "wear a clown nose every day", emoji: "🤡" }, b: { text: "wear a superhero cape every day", emoji: "🦸" } },
      { a: { text: "have a pet dinosaur", emoji: "🦖" }, b: { text: "have a pet dragon", emoji: "🐉" } },
      { a: { text: "live in a treehouse", emoji: "🌳" }, b: { text: "live in a castle", emoji: "🏰" } },
      { a: { text: "only walk backwards", emoji: "🔙" }, b: { text: "only hop on one foot", emoji: "🦶" } },
      { a: { text: "laugh like a hyena", emoji: "😂" }, b: { text: "snort like a pig when you laugh", emoji: "🐷" } },
      { a: { text: "be as tall as a giraffe", emoji: "🦒" }, b: { text: "be as small as a mouse", emoji: "🐭" } },
      { a: { text: "ride a giant snail to school", emoji: "🐌" }, b: { text: "ride a giant chicken to school", emoji: "🐔" } },
      { a: { text: "have a robot best friend", emoji: "🤖" }, b: { text: "have an alien best friend", emoji: "👽" } },
    ],
  },
  {
    id: "food",
    name: "Food",
    emoji: "🍕",
    items: [
      { a: { text: "only eat pizza forever", emoji: "🍕" }, b: { text: "never eat pizza again", emoji: "🚫" } },
      { a: { text: "have ice cream for breakfast", emoji: "🍦" }, b: { text: "have pancakes for dinner", emoji: "🥞" } },
      { a: { text: "eat a giant cookie", emoji: "🍪" }, b: { text: "eat a giant cupcake", emoji: "🧁" } },
      { a: { text: "only eat sweet food", emoji: "🍬" }, b: { text: "only eat salty food", emoji: "🥨" } },
      { a: { text: "have a chocolate river at home", emoji: "🍫" }, b: { text: "have a lemonade fountain at home", emoji: "🍋" } },
      { a: { text: "never eat chips again", emoji: "🍟" }, b: { text: "never eat chocolate again", emoji: "🍫" } },
      { a: { text: "eat with chopsticks forever", emoji: "🥢" }, b: { text: "eat with your hands forever", emoji: "🤲" } },
      { a: { text: "live in a gingerbread house", emoji: "🏠" }, b: { text: "live in a cheese house", emoji: "🧀" } },
      { a: { text: "drink only milk", emoji: "🥛" }, b: { text: "drink only juice", emoji: "🧃" } },
      { a: { text: "have a never-ending popcorn bowl", emoji: "🍿" }, b: { text: "have a never-ending sweets jar", emoji: "🍭" } },
      { a: { text: "eat a lemon", emoji: "🍋" }, b: { text: "eat a whole onion", emoji: "🧅" } },
      { a: { text: "be a famous chef", emoji: "👩‍🍳" }, b: { text: "be a famous cake taster", emoji: "🎂" } },
    ],
  },
  {
    id: "powers",
    name: "Superpowers",
    emoji: "🦸",
    items: [
      { a: { text: "fly", emoji: "🕊️" }, b: { text: "be invisible", emoji: "👻" } },
      { a: { text: "talk to animals", emoji: "🐾" }, b: { text: "speak every language", emoji: "🗣️" } },
      { a: { text: "breathe underwater", emoji: "🐬" }, b: { text: "walk on the ceiling", emoji: "🕷️" } },
      { a: { text: "run super fast", emoji: "⚡" }, b: { text: "be super strong", emoji: "💪" } },
      { a: { text: "teleport anywhere", emoji: "🌀" }, b: { text: "travel back in time", emoji: "⏳" } },
      { a: { text: "read minds", emoji: "🧠" }, b: { text: "see the future", emoji: "🔮" } },
      { a: { text: "shrink to the size of an ant", emoji: "🐜" }, b: { text: "grow as big as a building", emoji: "🏢" } },
      { a: { text: "control the weather", emoji: "🌦️" }, b: { text: "make plants grow instantly", emoji: "🌱" } },
      { a: { text: "never need to sleep", emoji: "🌙" }, b: { text: "never need to eat", emoji: "🍽️" } },
      { a: { text: "turn into any animal", emoji: "🦁" }, b: { text: "make copies of yourself", emoji: "👯" } },
      { a: { text: "have x-ray vision", emoji: "🩻" }, b: { text: "have super hearing", emoji: "👂" } },
      { a: { text: "pause time", emoji: "⏸️" }, b: { text: "rewind time by 10 seconds", emoji: "⏪" } },
    ],
  },
  {
    id: "life",
    name: "Everyday",
    emoji: "🏡",
    items: [
      { a: { text: "go to the beach", emoji: "🏖️" }, b: { text: "go to the mountains", emoji: "🏔️" } },
      { a: { text: "have a dog", emoji: "🐶" }, b: { text: "have a cat", emoji: "🐱" } },
      { a: { text: "always be a little too hot", emoji: "🥵" }, b: { text: "always be a little too cold", emoji: "🥶" } },
      { a: { text: "watch a movie", emoji: "🎬" }, b: { text: "read a book", emoji: "📚" } },
      { a: { text: "play in the snow", emoji: "⛄" }, b: { text: "play in a pool", emoji: "🏊" } },
      { a: { text: "be the oldest in the family", emoji: "👑" }, b: { text: "be the youngest in the family", emoji: "🍼" } },
      { a: { text: "go to space", emoji: "🚀" }, b: { text: "go to the bottom of the ocean", emoji: "🌊" } },
      { a: { text: "have a birthday every month", emoji: "🎂" }, b: { text: "have Christmas every month", emoji: "🎄" } },
      { a: { text: "be really good at drawing", emoji: "🎨" }, b: { text: "be really good at singing", emoji: "🎶" } },
      { a: { text: "get up really early", emoji: "🌅" }, b: { text: "stay up really late", emoji: "🌃" } },
      { a: { text: "live in the city", emoji: "🏙️" }, b: { text: "live on a farm", emoji: "🚜" } },
      { a: { text: "have no homework", emoji: "📝" }, b: { text: "have no chores", emoji: "🧹" } },
      { a: { text: "ride a roller coaster", emoji: "🎢" }, b: { text: "ride a hot air balloon", emoji: "🎈" } },
    ],
  },
];
