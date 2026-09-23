---
name: linear-margin-note-methodology
description: Use when distilling a technical paper, specification, algorithm, or codebase into append-only margin notes, a dependency-ordered ontology, a glossary, reviewed design documentation, and code-alignment findings.
---

# Linear Margin-Note Methodology

## Purpose

Turn a dense technical source into a sequence of inspectable, append-only reasoning layers. Each
layer moves forward from source detail toward a corrected ontology, dependency order, synthesis,
documentation, and code review without rewriting the evidence produced by earlier passes. The final 
layer is to be a standalone detailed technical explaination of the concepts as structured prose 
that is pedagogically optimised that is of sufficent quality to be a primer to the topic. 

Autoregressive language models benefit from this externalized linear process because each pass has
a narrower task, stable prior artifacts, and explicit terminology. That reduces ambiguity and
context drift. It does not make a model correct: source citations, independent cross-checks, and
showstopper gates remain mandatory.

This technique is suited to technical papers, mathematical algorithms, mechanics, protocols, and
codebases where concepts have real dependencies and conversational summarization would hide them.
It is also suitable run at an architectual refactoring phase where the code itself, the doc-comments 
of the code, and the design documentation, and prior runs are the input. That allows for an architectual
refactor phase were architectual weeds can be removed and long-term drift removed from the codebase 
through periodical realignmet. It may be the case that the drift is the correct new path and the original 
design is out of date with the latest competative landscape. The "Andon アンドン" concept below should be 
seen as the highest level of mastery that the very foundational assumptions may be challenged and changed 
at any time. 

## Core rules

1. Work inside a fresh project-local scratch directory, never an operating-system temporary path.
2. Write each layer forward and append-only. Do not repair an earlier layer after learning more;
   create the next corrective layer so comparisons remain possible.
3. Cover every substantive source paragraph, sentence, protocol step, equation, diagram claim, or
   code symbol. Record source locations. 
4. Give each concept one qualified, unambiguous preferred name. Detect collisions and aliases.
5. Add a glossary term on first encounter only. Never duplicate definitions.
6. Discover, categorize and separate concepts such as correctness/safety requirements from liveness assumptions, yet also consider what might be optimizations, pragmatics, scope, historical explanation, and implementation choices.
7. State why each idea exists. A protocol step without its reason cannot be reviewed intelligently.
8. Do not synthesize final prose until the concept inventory, dependency graph, and source
   cross-check exist.
9. Apply Andon アンドン to avoid any possible future product recall: the aim is to create a formal definition from which a real system can be built. It is an unlimited liablity future risk and so a showstopper if the formalism is internally inconsistent, has undocumented undefined behaviours, or else permits arbitrary parallel architectures to coexist. 
10. Keep old mistakes out of the final layer documentation. History remains visible in scratch layers;
    final docs contain only the corrected model and an explicit terminology mapping where needed.

## Workspace shape

Use ordered files so each pass is independently readable:

```text
.tmp/<topic>-review/
  source-01-<section>.md
  source-02-<section>.md
  ...
  concept-inventory.md
  concept-dependencies.md
  dependency-depth-order.md
  corrected-formalism.md
  glossary.md
  crosscheck-source-formalism.md
  docs-review.md
  code-01-<layer>.md
  code-02-<layer>.md
  ...
  code-hardening-delta.md
```

Parallel agents may write non-overlapping files. Only one pass may append glossary entries after
deduplicating candidates from all parallel layers. Passes before that are aligned to elaboration, 
discovery and enumeration. Passes after that are conslidation and refinement. This means that the 
writing of the glossary is a critical disambiguation fulcrum point. While Andon アンドン 
may be called at any phase the point of the writing of the glossary is where the most value and 
least cost is to ask and where discussion and knowledge-transfer bloom from false positivies. 
Stopping the line here is to be celebrated. In particular if the new glossary differs significantly 
from prior runs or any pre-existing code or docs we should pause to discuss. This means that we 
can may have an "Andon Lite" which is to simply discuss that the process has found drift. 

## Pass 1: margin notes

Read the source in order. For each substantive unit append:

```markdown
- Source: <page/section/lines>
- Claim: <what the source says>
- Concept: <one concept, occasionally two inseparable concepts>
- Reason: <why the source needs it>
- Classification: <correctness | safety | liveness | optimization | assumption | pragmatics |
  recovery | reconfiguration | scope | historical explanation>
- Dependency: <concepts that must already be understood>
- Required or chosen: <protocol necessity, stricter safe restriction, or design option>
- Question/trade-off: <only when the source leaves one open>
```

Do not force a polished explanation. These are the notes one would write in the paper's margins
while preparing for an examination.

## Pass 2: concept inventory

Extract the complete forward list of concepts from the margin notes.

- Merge true duplicates.
- Preserve distinct concepts that happen to share colloquial words.
- Qualify ambiguous terms by domain.
- Choose one preferred term and record source aliases in the glossary.
- Reject names that collide with adjacent technical domains when a clearer term exists.

Each concept must carry meaning independently of the sentence where it first appeared. 
We must not simply allow ambiguity to exist. During a first pass we are elaborating so 
all concepts are collected. Yet where there is possible ambiguity and overlap these should be 
noted in the margins where the term is first found. 

## Pass 3: dependency graph

For every concept write:

```text
Concept -> direct prerequisite concepts
```

Dependencies must be conceptual, not merely the order used by the source. Detect cycles; a cycle
usually indicates an overloaded concept or a missing foundational concept.

## Pass 4: dependency depth

Assign depth:

```text
depth(concept) = 0                                      when it has no prerequisites
depth(concept) = 1 + max(depth(each direct prerequisite)) otherwise
```

Restate the entire inventory sorted by depth. This is the first pedagogical ordering: every term is
defined only after its prerequisites.

## Pass 5: second synthesis

The first pass has a bias in terms of which terms are encountered early and repeated often. Yet it may be the case that the last terminology encountered is a key to comprehensiblity. It is particurly the case the the User runs this process when they have just had an "aha!" moment. This means that we want to repeat the scan of the source materially judged against the best ontology and terminology or clarification of the requirements or intent or peferred design. We do not want to endless iterate through and flip flop on terminology yet we are looking to roll-out the kinks. Only once roll the material out from the top re-evaulating each source item from the perpsect of the outputs of the prior pass working in a append only new pass manner:

1. raw concept inventory;
2. concepts with direct dependencies;
3. concepts with dependency depths;
4. concepts sorted by depth;
5. concise definitions in depth order;
6. detailed formalism in depth order;
7. human walkthrough in the same order.

It is important to note that if there is a unique approach or strategy been taken by the user, or a unique emphasis, do not drop it. Diff the seond pass with the first one and run with the first one into the final phase if the second pass looses the the "spirit" if not "the letter" of what the User has stated is their perferred approach.  

Note the user makes errors of commission so if here is an inherent contradiction in the matterail then halt, as the user to enable planning mode so you can disabiguate, and ask them to make an explicit statement to resolve the problem. Then do a full reset with the clarification the rerun should correctly converge. 

## Pass 6: source/formalism cross-check

Check every material formalism rule against source citations. Classify it as:

- exact alignment;
- terminology-only mapping;
- stricter safe restriction;
- deliberate out-of-scope omission;
- optimization;
- liveness gap;
- safety violation.

End with an explicit `Andon アンドン: YES|NO` verdict. We do not know that these may be yet they are 
in some sense architectual or design showstoppers such as something in the design that permits loss,
conflict, arbitrary reordering, undefined behaviour, hard to test behavour, undocumented behaviours, 
duplicate execution, stale participation, or making source-level correctness
challenging. It can also be an "Andon Lite" which is simply that there was prior code or prior runs 
where we have now decided to retire/merge/add/clarify some concepts due to continual learning. That is 
to say let us stop to celebrate what we have learned.  

## Pass 7: documentation synthesis

Only after `Andon アンドン: NO`:

1. publish the corrected formalism as a standalone reviewer walkthrough;
2. publish a concise glossary using preferred terms and explicit source mappings;
3. audit every project-authored document for stale mechanics and terminology;
4. preserve third-party source material verbatim;
5. remove rejected intermediate ideas from release-facing prose.

Documentation must distinguish specification from tested implementation status.

## Pass 8: impact notes

Review every relevant type, field, enum variant, function, method, helper, FFI declaration, test,
and build edge in source order. Append:

```markdown
- Symbol and source location
- Exact role
- Inputs, state read/written, and outputs
- Callers and dependencies
- Corrected-formalism section
- Source-paper basis
- Classification
- Alignment verdict
- Missing test or glossary candidate
```

Split architectural layers into separate files so cross-layer ownership and terminology can be
compared without mixing them. This is not a coding phase it is a planning to code phase. 

## Synthetic high-level fictional example: corrected fixed-membership VRR

This example demonstrates the layers without reproducing protocol detail.

### Step 1: margin notes 

Identifies membership, node identity, epoch, deterministic leader, slot, log, client envelope,
client table, commit frontier, execution frontier, quorum, normal-operation messages, epoch-change
messages, recovery messages, predicted execution values, safety, and liveness. The word "view" is 
present yet the user is unable to comprehend other than "a database view" concept. 

In our fiction example the code and documentation and gh tickets include duplicated things such as "term" and "leader" and "index" as well as cluster membership. The concept of "seq" as a global index to the log is conflated with 
it being a "counter of a leader within a term". This problems exist in parallel to the correct concepts. 

### Step 2: concept inventory

Record that leadership depends on membership and epoch; slots and log entries depend on ordered
membership operation; commitment depends on quorum acceptance; epoch installation depends on two
qualified exchanges and whole-log selection; recovery depends on nonce-bound quorum evidence and
exact-epoch leader state. 

In our fictional example we are still in elaboration and enumeration so the incorrect concepts are 
still in-flight. 

### Step 3, 4, 5 & 6: dependency depth, dependency depth, second synthesis, source/formalism cross-check

Place membership and opaque client values first; identity, epoch, and quorum next; leadership and
slots after them; then logs/messages; finally epoch change, recovery, and invariants. 

Yet in our fictional example have the cookoos eggs of the conflated ideas and "seq" being a counter for a distingushed 
leader that is in addition to a "slot" which is the log index. 

The outcome is `Andon アンドン: YES` there is ambiguity and the additional ideas cannot be put into a glossary with an entry that points to them in the original scientific paper nor a foundational document in the repo that explains exactly why these new terms have been added such as some performance optimisations or pragmatics that are known to not harm correctness or soundness. 

This scenario was how "Linear Margin-Note Ideation Skill" was born. It is fiction that this final form was applied yet the actual confusions and conflations were real. The Andon lead to a massive rewrite of documention and tests then a Red/Green tdd rebuild. The process was then run again from the top and only minor drift between tests, docs, code were found and corrected. 

## Completion criteria

- Every substantive source unit has a margin note and citation.
- Every final concept is unique, qualified, dependency-linked, and in the glossary.
- The ontology has no unexplained cycle or ambiguous aliases.
- The formalism has a source cross-check and so less risk of showstoppers.
- Published docs are corrected to use the glossary terms and have explicit source mappings.
- Every relevant protocol level code symbol is tied back to source and formalism.

## Append: Git

If git or another source control is being do not put the layers that are not the glossary or final sythesis under source control. Doing so ossifies the fluctuating sources to the distilled truths and pollutes the truth and makes historic accidents part of the work. Knowledge work is not data nor infomation it is insights and invariants. Do not cannonise the exhaust of a process that is often run to pivot or align so has lint that must be washed away.

End.
