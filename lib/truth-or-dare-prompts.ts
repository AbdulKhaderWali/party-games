import type { Word } from "./words";

export type TodPack = {
  id: string;
  name: string;
  emoji: string;
  truths: Word[];
  dares: Word[];
};

/**
 * Kid-friendly only: truths are about favourites and funny moments, never secrets or crushes.
 * Dares are safe to do indoors, need no props beyond what's in a living room, and never involve
 * touching someone who hasn't agreed, eating anything, or leaving the room.
 */
export const TOD_PACKS: TodPack[] = [
  {
    id: "silly",
    name: "Silly",
    emoji: "🤪",
    truths: [
      { text: "What's the silliest thing you've ever done?", emoji: "🤪" },
      { text: "What's the funniest word you know?", emoji: "🔤" },
      { text: "Have you ever laughed so hard you cried?", emoji: "😂" },
      { text: "If you were a cartoon character, who would you be?", emoji: "📺" },
      { text: "What's the weirdest food you actually like?", emoji: "🥒" },
      { text: "What animal do you think you'd be?", emoji: "🐾" },
      { text: "What's the funniest dream you've ever had?", emoji: "💭" },
      { text: "Do you talk to your toys or pets?", emoji: "🧸" },
      { text: "What's the most embarrassing song you know all the words to?", emoji: "🎵" },
      { text: "If you could rename yourself, what name would you pick?", emoji: "📛" },
      { text: "What's the silliest thing that ever made you cry?", emoji: "🥲" },
      { text: "Have you ever waved at someone who wasn't waving at you?", emoji: "👋" },
    ],
    dares: [
      { text: "Talk like a robot until your next turn", emoji: "🤖" },
      { text: "Do your best chicken dance", emoji: "🐔" },
      { text: "Say the alphabet with your tongue out", emoji: "😛" },
      { text: "Make the funniest face you can for 10 seconds", emoji: "🤪" },
      { text: "Pretend to be a monkey for 15 seconds", emoji: "🐒" },
      { text: "Sing 'Happy Birthday' like an opera singer", emoji: "🎤" },
      { text: "Walk like a penguin across the room", emoji: "🐧" },
      { text: "Tell a joke – if nobody laughs, tell another", emoji: "🤡" },
      { text: "Speak in a pirate voice until your next turn", emoji: "🏴‍☠️" },
      { text: "Do your best impression of someone in the room", emoji: "🎭" },
      { text: "Pretend you're a news reporter and report on the room", emoji: "📰" },
      { text: "Make up a song about your socks", emoji: "🧦" },
    ],
  },
  {
    id: "move",
    name: "Move It",
    emoji: "🏃",
    truths: [
      { text: "What's your favourite sport or game to play?", emoji: "⚽" },
      { text: "What's the highest you've ever climbed?", emoji: "🧗" },
      { text: "Can you do a cartwheel? Prove it later!", emoji: "🤸" },
      { text: "What's your best dance move called?", emoji: "🕺" },
      { text: "If you could be amazing at one sport, which one?", emoji: "🏅" },
      { text: "What's the fastest you've ever run?", emoji: "💨" },
      { text: "What's your favourite playground thing?", emoji: "🛝" },
      { text: "Would you rather swim, bike or run?", emoji: "🚴" },
    ],
    dares: [
      { text: "Do 10 star jumps", emoji: "⭐" },
      { text: "Hop on one foot for 15 seconds", emoji: "🦶" },
      { text: "Freeze like a statue until someone laughs", emoji: "🗿" },
      { text: "Do your best superhero landing", emoji: "🦸" },
      { text: "Dance with no music for 15 seconds", emoji: "💃" },
      { text: "Spin around 5 times, then walk in a straight line", emoji: "🌀" },
      { text: "Do a crab walk across the room", emoji: "🦀" },
      { text: "Balance a pillow on your head for 10 seconds", emoji: "🛏️" },
      { text: "Pretend the floor is lava – get across the room!", emoji: "🌋" },
      { text: "Act out your favourite animal without making a sound", emoji: "🦘" },
      { text: "Do 5 frog jumps", emoji: "🐸" },
      { text: "Show everyone your best yoga pose", emoji: "🧘" },
    ],
  },
  {
    id: "brainy",
    name: "Brainy",
    emoji: "🧠",
    truths: [
      { text: "What's your favourite thing to learn about?", emoji: "📚" },
      { text: "If you could invent anything, what would it be?", emoji: "💡" },
      { text: "What job do you want when you grow up?", emoji: "👩‍🚀" },
      { text: "What's the coolest fact you know?", emoji: "🤓" },
      { text: "If you could visit any country, where would you go?", emoji: "🗺️" },
      { text: "What's the best book or movie you've ever seen?", emoji: "🎬" },
      { text: "If you could ask an animal one question, what would it be?", emoji: "🐘" },
      { text: "What would you do if you were in charge for a day?", emoji: "👑" },
    ],
    dares: [
      { text: "Spell your name backwards out loud", emoji: "🔁" },
      { text: "Name 5 animals in 10 seconds", emoji: "🐾" },
      { text: "Count backwards from 20 as fast as you can", emoji: "🔢" },
      { text: "Say a tongue twister three times fast: 'red lorry, yellow lorry'", emoji: "👅" },
      { text: "Name a fruit for every colour of the rainbow", emoji: "🌈" },
      { text: "Make up a short poem about the person on your left", emoji: "✍️" },
      { text: "Name 3 words that rhyme with 'cat' in 5 seconds", emoji: "🐱" },
      { text: "Explain how to brush your teeth like a teacher", emoji: "🪥" },
    ],
  },
  {
    id: "kind",
    name: "Kind",
    emoji: "💛",
    truths: [
      { text: "Who made you smile today?", emoji: "😊" },
      { text: "What's something you're really proud of?", emoji: "🏆" },
      { text: "What's the nicest thing someone has done for you?", emoji: "🎁" },
      { text: "What's your favourite thing about your family?", emoji: "👨‍👩‍👧" },
      { text: "What's something that always cheers you up?", emoji: "🌞" },
      { text: "What are you really good at?", emoji: "💪" },
      { text: "What's your happiest memory?", emoji: "💭" },
      { text: "Who is someone you look up to?", emoji: "🌟" },
    ],
    dares: [
      { text: "Give everyone a high five", emoji: "🙌" },
      { text: "Say something nice about the person on your right", emoji: "💬" },
      { text: "Give someone a real compliment", emoji: "💐" },
      { text: "Do a happy dance for the whole group", emoji: "🥳" },
      { text: "Thank someone in the room for something", emoji: "🙏" },
      { text: "Make everyone smile without saying a word", emoji: "😁" },
      { text: "Tell the group your favourite thing about today", emoji: "☀️" },
      { text: "Give someone a big thumbs up and tell them why", emoji: "👍" },
    ],
  },
];
