---
name: visual-explain
description: >-
  Explains a design, flow, change, or trend to people in few words and small Mermaid diagrams and
  charts: a person first, evidence for agents last, rendering where they are read. Use when asked to
  explain, draw, or chart how something works or changes, or when another skill draws for people.
---

# Visual Explain

Explains one thing to someone who has not seen it: a design, a flow, a change, an incident. Skills
that write for people (`architect-review`, `pr-description`, `code-architecture` § README contract)
keep their own sections and load this one only when their content passes § When to draw; simple
content stays plain text. The studies behind each rule are in
[references/evidence.md](references/evidence.md).

## Words

- **A person first, an agent second.** A person reads from the top and stops once they know enough:
  the answer first, then the parts, then the detail. What only an agent needs (`file:line` links,
  symbols, commands, probe output) comes last, marked **For agents**: a quoted note under a point
  (`> **For agents:** …`) or a closing `## For agents` section. A person can skip it.
- **Headings and titles state the claim**, `Cache key drops the tenant`, never the topic,
  `Analysis`. Scanners read mostly headings, and readers keep a chart's title over its data even
  when the two disagree, so check every claim against the data it sits on.
- **The first words of each line carry it.** Readers scan down the left edge; start with the subject
  or the verb, never with "Note that" or "In this section".
- **Cut words, never facts.** Each point keeps its trigger, its effect, its evidence, and what to
  do. Comparisons are facts: a number has its unit and its baseline, `p95 1.2 s, was 3.4 s`. Drop
  the story of how it was found, restated context, and hedges.
- **Short lines**: under about 20 words, plain words, bold lead-ins in lists, and the one to three
  key words of a paragraph in bold. Say once what a project term means.
- **One name per thing**: the node label is the word the text uses.
- **The words stand alone.** Screen readers get a diagram as run-together words, and a client
  without Mermaid shows its code, so the text carries the claim and every fact, and the diagram
  shows how the parts relate. The text never narrates the diagram edge by edge: a reader who knows
  the code loses time on the same thing said twice.

## When to draw

A visual saves effort only when the reader must hold several connected parts at once; for simple or
step-by-step content it adds reading and nothing else. Take the first that fits:

1. **One fact, or one or two numbers**: a sentence, `p95 1.2 s, was 3.4 s`.
2. **Exact values to look up, or up to about 20 numbers with no shape to see**: a table.
3. **Steps that each follow the last**, with no branch, loop, or second actor: a numbered list.
4. **Three or more parts that interact**: a diagram.
   - a flowchart: three or more nodes with a branch, a loop, or several paths in or out;
   - a sequence: two or more actors exchanging three or more messages;
   - a state diagram: three or more states with conditional moves;
   - a chart: enough points that the shape is the message.
5. **None of these**: words.

The reader moves the bar. Reviewers who know the code need no diagram of a structure that did not
change; when it changed, draw only the changed part, with the code's names. Newcomers, in a README
or an onboarding page, gain the most from one diagram of the whole.

## Diagrams

Only parts that exist, one diagram per point.

| To show                              | Draw                                           |
| ------------------------------------ | ---------------------------------------------- |
| Several parts or points at a glance  | `mindmap`                                      |
| A path to a result or a failure      | `flowchart LR`, broken branch beside the fixed |
| Parts and what depends on what       | `flowchart TB`                                 |
| Messages between processes over time | `sequenceDiagram`                              |
| States and what moves between them   | `stateDiagram-v2`                              |

- **About four things to hold**: four colors, styles, or series at most. Past five nodes, group them
  in labelled `subgraph`s in a flowchart, or split the diagram.
- **No crossing edges**, which confuse readers more than bends or asymmetry: choose `LR` or `TB` and
  the node order to remove them, and split the diagram if one remains.
- **Words on the parts**: an edge says what happens or when, `A -->|"retries 3x"| B`, and a node
  holds its key value.
- **One highlight**: the node or path the point is about stands out and the rest stays plain. Its
  label says it too ("fails"), since color alone misses some readers. In a flowchart it gets a red
  border and a thick red edge, readable in light and dark themes; other diagrams rely on the label:

  ```text
  classDef bad stroke:#d1242f,stroke-width:3px
  class C bad
  linkStyle 1 stroke:#d1242f,stroke-width:3px
  ```

- **A summary for screen readers**: `accTitle: <the claim>` and `accDescr: <one sentence>` on the
  lines right after the diagram's type (`flowchart LR`); placed before it, the type is not found.

## Charts

A chart answers "is it getting worse?" or "which is bigger?" at a glance, which a table of numbers
does not. Its `title` states the finding, `PR 42 cuts p95 latency by 42%`, and the numbers stay in
the text beside it, which the chart alone may not show.

| To show                                      | Draw                                       |
| -------------------------------------------- | ------------------------------------------ |
| A trend: timings, sizes, or counts over time | `xychart-beta` with one `line`             |
| A few values side by side: before and after  | `xychart-beta` with one `bar`, axis from 0 |
| Work over dates: phases, progress, overlap   | `gantt`                                    |
| What happened when, without durations        | `timeline`                                 |

- **One series per chart**, two at most. More go in separate charts with the same fixed axis range,
  so only the data changes between them.
- **Labels on the bars**: `showDataLabel: true` labels bars only, so a line's values stay in the
  text; `showLegend: true` names the series (`line "main" [...]`). Both go under `config: xyChart:`
  in the chart's frontmatter. Mermaid 11.17 draws them; 11.4 ignores them without an error.
- **A bar chart's axis starts at 0**, set by hand (`y-axis "ms" 0 --> 400`). Left to itself, it
  starts near the smallest value and turns a 40% gap into a cliff. A line may start higher when the
  size of the change matters; the text then gives the baseline.
- **Bars sorted by value**, unless their order means something (stages, time).
- **One bar highlighted**: a grey series with every value and a red series holding only the one that
  matters (`bar [310, 180]`, then `bar [0, 180]`), colored by `plotColorPalette: "#8c959f, #d1242f"`
  under `themeVariables: xyChart:`. It garbles value labels, so it goes without them.
- **A pie only for one share of a whole**, and a sentence ("about half") usually says it better.
  Bars for anything ranked: people compare angles poorly.
- **A gantt draws a line at today**, which moves each day the page is read. Turn it off with
  `todayMarker off` unless progress against today is the point.
- **Where `xychart-beta` is missing** (Mermaid before 10.3), a gantt draws bars: `dateFormat X`,
  `axisFormat %s`, `todayMarker off`, and a row `main : 0, 1180` per value.

## What breaks

Tested in Mermaid 10.2 to 11.17; a failed diagram shows its readers raw code or an error:

- **An unquoted flowchart label with a parenthesis.** Quote every label and edge text, as in
  `A["save(path) runs"] -- "PR: report id" --> B["…"]`; quoted, any bracket, `#`, or `;` renders.
- **Brackets or parentheses in mindmap text**, where they set a node's shape. Rephrase, or write the
  node as `a["list [a] here"]`. The root's `((…))` is its shape.
- **A `;` in a sequence message**, which ends the statement. Use a comma.
- **A `:` in a gantt task name** silently cuts the name there; a `#` in it fails in Mermaid 10.2.
- **A `:` in a timeline period**, which separates it from its events: write `09.10`, not `09:10`.
- **`xychart-beta` before Mermaid 10.3**, which knows no such diagram.

Render each diagram once before it ships when a renderer is at hand: the target itself, or Mermaid
in a browser.

## Where it is read

- **GitHub** (pull request bodies, comments, issues, Markdown files): renders Mermaid at a version
  it does not document, so preview a newer type or option, such as `mindmap`, `xychart-beta`, or
  value labels, once; a `mermaid` block holding `info` prints the version. Link a file as a
  permalink at the commit, `https://github.com/<owner>/<repo>/blob/<sha>/<path>#L<line>`, since
  GitHub resolves no relative path in a comment or a PR body; a README in the repository links
  relatively. Nothing local: no machine paths, scratch files, or session links.
- **Obsidian** (wiki vaults): renders Mermaid with its own bundled version; preview a newer type
  once in the vault. Links take the vault's own form.
- **A terminal or a chat without Mermaid**: the words carry it all, and the diagram is extra, so
  keep it small or leave it out. Local `path:line` links work there.
