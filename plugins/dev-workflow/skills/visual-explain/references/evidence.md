# Evidence

The studies and guides behind `visual-explain`'s rules, for people who maintain or question them.
Each line names the finding; follow the link for the method.

## Words

- **Answer first.** Readers stop at any point, so the conclusion leads:
  [NN/g, inverted pyramid](https://www.nngroup.com/articles/inverted-pyramid/).
- **Headings and titles as claims.** Readers given the same chart under opposite titles took
  opposite messages from it, and recalled the title over the data when they disagreed:
  [Kong et al., CHI 2018](https://mail.zcliu.cs.umd.edu/vistitles/CHI18-VisTitles.pdf),
  [Kong et al., CHI 2019](https://mail.zcliu.cs.umd.edu/vistitles/degree-of-misalignment-CHI19.pdf).
  Titles and text carry a chart's message in recall:
  [Borkin et al., 2015](https://vcg.seas.harvard.edu/publications/20150101-beyond-memorability-visualization-recognition-and-recall).
  Scanners read mostly the headings:
  [NN/g, layer-cake scanning](https://www.nngroup.com/articles/layer-cake-pattern-scanning/).
- **First words carry the line.** Fixations fall on the first lines and the left edge:
  [NN/g, F-shaped pattern](https://www.nngroup.com/articles/f-shaped-pattern-reading-web-content/).
- **Cut words.** 79% of users scan; concise text tested 58% more usable, scannable text 47%, and
  concise, scannable, and objective text together 124%:
  [NN/g, how users read](https://www.nngroup.com/articles/how-users-read-on-the-web/). Removing
  extraneous material helped in 18 of 19 tests:
  [Mayer, 2023](https://www.unh.edu/teaching-learning-resource-hub/sites/default/files/media/2023-06/itow-research-based-principles-for-designing-multimedia-instruction-mayer.pdf).
- **Comparisons and units as facts.** Text stating a comparison led readers to that takeaway; text
  describing the axes led to none:
  [Stokes et al., VIS 2022](https://vis.mit.edu/pubs/vis-text-balance.pdf). Every number with its
  unit and what it measures:
  [Datawrapper, text in charts](https://www.datawrapper.de/blog/text-in-data-visualizations).
- **Plain, short sentences**:
  [digital.gov, plain language](https://digital.gov/guides/plain-language/writing/).
- **Words that stand alone.** In 2022, screen readers read a Mermaid diagram on GitHub as
  run-together text, and clients without JavaScript show its code:
  [Roselli, 2022](https://adrianroselli.com/2022/03/maybe-dont-use-flow-charts-on-github.html). Some
  readers prefer the text alone:
  [Stokes et al., VIS 2022](https://vis.mit.edu/pubs/vis-text-balance.pdf).

## When to draw

- **A diagram saves search, not information.** It helps when it groups what is used together, and
  more as the parts grow; an arbitrary diagram does not:
  [Larkin and Simon, 1987](https://mechanism.ucsd.edu/bill/teaching/F12/cs200/Readings/larkin.whyadiagramissometimesworth.1987.pdf).
- **Only connected parts gain.** Layout matters when parts must be held at once, and not for steps
  learned one by one:
  [Sweller, 1994](https://mrbartonmaths.com/resourcesnew/8.%20Research/Explicit%20Instruction/CLT,%20learning%20difficulty%20and%20instructional%20design.pdf).
- **Three interacting parts.** With two, visuals helped novices and hurt experts; with three, they
  helped both: Lee et al., 2006, in
  [Kalyuga, 2007](https://www.uky.edu/~gmswan3/EDC608/Kalyuga2007_Article_ExpertiseReversalEffectAndItsI.pdf).
  One study in one domain; the rule's other counts are judgment.
- **Experts lose on restated content.** Words plus pictures helped low-knowledge learners by 52-87%
  and high-knowledge ones by 8-15%: [Mayer, 1997](https://www.uky.edu/~gmswan3/544/mayer_1997.pdf);
  a source that makes sense alone makes a second one redundant (Kalyuga, 2007).
- **A sentence for one or two numbers, a table for up to about 20**, a graph when the shape is the
  message: Tufte, _The Visual Display of Quantitative Information_, pp. 30, 56, 178, rules of thumb;
  [Few, 2009](https://public.dhe.ibm.com/software/data/sw-library/cognos/pdfs/whitepapers/wp_visual_communications_core_design_principles.pdf);
  tables for exact values, graphs for trends:
  [Hegarty, 2011](https://mechanism.ucsd.edu/bill/teaching/F12/cs200/Readings/hegarty.thecognitivescienceofvisua-spatialdisplays.implicationsfordesign.2011.pdf).
- **The diagram's shape matches the idea's.** Steps read as steps; an animation has not been shown
  to beat a static diagram of the same content:
  [Tversky et al., 2002](https://www.uky.edu/~gmswan3/575/Tversky_2002.pdf).
- **In software**, UML helped only on complex changes
  ([Arisholm et al., 2006](https://pure.ul.ie/en/publications/the-impact-of-uml-documentation-on-software-maintenance-an-experi/)),
  and models that map onto the code helped while analysis-level ones hurt
  ([Scanniello et al., 2015](https://bia.unibz.it/esploro/outputs/bookChapter/Studying-the-Effect-of-UML-Based-Models/991006431296101241)).
  No study we found measures diagrams in pull requests or code review.

## Diagrams

- **Words plus a diagram** beat words alone for how something works, and words placed beside the
  parts they name beat words apart from them:
  [Mayer, 2023](https://www.unh.edu/teaching-learning-resource-hub/sites/default/files/media/2023-06/itow-research-based-principles-for-designing-multimedia-instruction-mayer.pdf).
- **One highlight.** Cues that point at the essential part helped in 26 of 28 tests (Mayer); one
  item with a distinct attribute stands out without effort:
  [Few, visual perception](https://www.perceptualedge.com/articles/ie/visual_perception.pdf);
  highlight one or two values and grey the rest:
  [Datawrapper, colorblindness](https://www.datawrapper.de/blog/colorblindness-part2),
  [Wilkins, information at a glance](https://www.jdhwilkins.com/information-at-a-glance-do-your-charts-suck/).
- **Never color alone**:
  [WCAG 2.2, use of color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html).
- **About four things to hold.** Working memory holds about four chunks
  ([Cowan, 2001](https://pubmed.ncbi.nlm.nih.gov/11515286/)); group past that:
  [NN/g, chunking](https://www.nngroup.com/articles/chunking/).
- **No crossing edges.** Crossings hurt understanding of a graph far more than bends or asymmetry:
  [Purchase, Graph Drawing 1997](https://link.springer.com/chapter/10.1007/3-540-63938-1_67).
- **Screen reader summaries**:
  [Mermaid, accessibility](https://mermaid.js.org/config/accessibility.html).

## Charts

- **Position and length before angle and area.** Readers judge positions on a common scale most
  accurately, then lengths, then angles and areas: Cleveland and McGill, 1984, as taught in
  [Cornell INFO 3312](https://info3312.infosci.cornell.edu/slides/04-graphical-perception.html).
- **Pies.** A pie signals part of a whole and reads well near a quarter or a half; anything ranked
  belongs in bars:
  [Few, save the pies for dessert](https://www.perceptualedge.com/articles/visual_business_intelligence/save_the_pies_for_dessert.pdf),
  [Wilkins](https://www.jdhwilkins.com/information-at-a-glance-do-your-charts-suck/).
- **Bars from zero; lines may start higher.** A truncated bar exaggerates the difference:
  [Datawrapper, bars start at zero](https://www.datawrapper.de/docs/why-our-column-and-bar-charts-start-at-zero).
- **Sorted bars** are easier to read:
  [Wilkins](https://www.jdhwilkins.com/information-at-a-glance-do-your-charts-suck/).
- **Few series, same axes across charts**:
  [Pew, small multiples](https://www.pewresearch.org/decoded/2018/12/20/how-pew-research-center-uses-small-multiple-charts/);
  direct labels before a legend:
  [Datawrapper, color keys](https://www.datawrapper.de/blog/color-keys-for-data-visualizations).
- **Gantt as bars** where no bar chart exists:
  [Lock, 2023](https://andrewlock.net/drawing-graphs-in-github-comments-with-mermaid-diagrams/).
- **xychart options** (value labels, legend, axis ranges):
  [Mermaid, XY chart](https://mermaid.js.org/syntax/xyChart.html).
