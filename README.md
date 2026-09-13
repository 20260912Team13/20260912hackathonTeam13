# Mars Builder

Design life on Mars.

2036年、火星の街は専門家だけが作るものではない。暮らしたい未来を言葉にすれば、AIがそれを建築へ変えてくれる。

## Concept

Mars Builder is a future product experience where everyday Mars residents describe the place they want, and AI translates that human desire into a buildable architecture plan using Martian regolith and robotic 3D printing.

This hackathon prototype is not a precise space architecture simulator. It is an experience of building your own place on Mars.

## MVP Flow

1. Imagine: user writes what they want to build.
2. AI Design: AI converts the wish into a building proposal.
3. Place: user chooses where to place it on Mars.
4. Build: regolith is charged and 3D printing begins.
5. Complete: user sees the finished place and share card.

## Team Workstreams

| Area | Directory | Owner | Goal |
| --- | --- | --- | --- |
| Web prototype | `apps/prototype` | TBD | Mobile-first interactive demo |
| Moving UI / motion | `apps/prototype` + `assets/video` | TBD | Build sequence, transitions, UI animation |
| Video | `video` | TBD | 60 sec future vision movie |
| Presentation | `presentation` | TBD | Pitch deck and demo script |
| Design / assets | `design`, `assets` | TBD | Visual direction, images, share cards |
| Product docs | `docs` | TBD | Concept, architecture, AI usage, future vision |

## Repository Structure

```text
.
├── apps/
│   └── prototype/        # Web app / mobile prototype
├── assets/
│   ├── images/           # Generated or designed still images
│   ├── share-cards/      # SNS share card exports
│   └── video/            # Video clips and rendered sequences
├── design/               # Design direction, UI references, copy
├── docs/                 # Product brief, architecture, AI usage
├── presentation/         # Pitch deck, speaking script, demo plan
└── video/                # Storyboard, prompts, edit plan
```

## Demo

Target demo experience:

```text
Wish input
→ AI generated proposal
→ place on Mars
→ BUILD
→ completed building
→ share card
```

## Architecture

For the hackathon MVP, the app can use mocked AI responses and local assets. The important thing is that the experience feels coherent:

- Human: imagines the place.
- AI: translates desire into architecture.
- Robot: builds using Martian regolith.

## AI Usage

AI is positioned as the translator from:

```text
Human Desire → Architecture
```

It generates the building name, capacity, area, regolith amount, print time, safety notes, and share copy from a natural language wish.

## Future Vision

One person builds one place. 100 people build 100 places. Eventually, a city grows from human imagination.

