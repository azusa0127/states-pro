# STATES PRO

![cover](./images/cover.png)

## CPSC 410 Perfect Team

- Chen Song
- Yuan Bian
- Xiuyuan Lu
- Zhenpeng Wu
- Jingwei Zhang

## Description

A DSL aims to draw state machines, turing machines, and Pushdown Automata.

## Goals

1. Design the language and come up with examples.
2. Decide which language to implement the this DSL.
3. Implement the language using javascript
4. Implement merge feature
5. Convert it to a MScode library (tool?) and extend other latex languages

## EBNF

```bnf

WhiteSpace ::= " " | "\t" | "\r"
LineBreak ::= "\n"
Letter ::= "a" | "b" | ... | "z" | "A" | ... | "Z"
Digit ::= "0" | "1" | "2" | ... | "9" ;
Symbol = "[" | "]" | "{" | "}" | "(" | ")" | "<" | ">" | "'" | '"' | "=" | "|" | "." | "," | ";" | "\";
String = { WhiteSpace | Letter | Digit | Symbol }

Label ::= StringLabel | LatexLabel | Identifier
LatexLabel ::= "$", String, "$"
StringLabel ::= "`", String, "`"
Identifier ::= Letter, { Letter | Digit | "_" }
PropIdentifier ::= Identifier, ".", Identifier

FigureType ::= 'StateMachine'

Program ::= DefineOperation, { DefineOperation | DrawOperation | MergeOperation }

DefineOperation ::= 'define', FigureType, Identifier, "{", LineBreak, DefineStmt, { DefineStmt }, "}", LineBreak
DefineStmt ::= Node, [ '->', Edge, { ",", Edge} ], LineBreak
Node ::= Identifier, [ "(", NodeState, [ ",", Label ], ")"]
Edge ::= Identifier, [ "(", Label, ")" ]
NodeState ::= 's' | 'f' | 'sf' | 'fs' | 'n'

DrawOperation ::= 'draw', Identifier, LineBreak

MergeOperation ::= 'merge', FigureType, Identifier, Identifier, 'as', Identifier, "{", LineBreak, MergeStmt, { MergeStmt }, "}", LineBreak
MergeStmt ::= MergeNode, [ '->', MergeEdge, { ",", MergeEdge } ], LineBreak
MergeNode ::= PropIdentifier, [ "(", NodeState, [ ",", Label ], ")" ]
MergeEdge ::= PropIdentifier, [ "(", Label, ")" ]
```

## Examples

### Create State Machine

```dsl
define StateMachine m1 {
  q1(n,`M.I.D`) -> q2(`0`), q3($0,1,\epsilon$)
  q2(sf, qAccept) -> q1(`0,1`)
  q3(f,$q_3$)
}
```

#### Loop Back Single State

```
define StateMachine m {
    q0(sf, $q_0$) -> q0(`a`), q0(`b`), q0(`c`)
}
```

```
\begin{tikzpicture}[shorten >=1pt,node distance=2.8cm,on grid,auto]
    \node[state,initial,accepting] (q0) {$q_0$};
    \path[->]1
    (q0) edge [loop above] node {$b$} (q0)
         edge [loop below] node {$a$} (q0)
         edge [loop right] node {$c$} (q0);
\end{tikzpicture}
```

![loop back single state](./images/loop_back_single_state.png)

#### Cube

```
define StateMachine m {
    q0(s, $q_0$) -> q1(`0`), q2(`1,2`)
    q1(n, $q_1$) -> q2(`0`)
    q2(f, $q_2$) -> q2(`0`), q3(`1,2`)
    q3(f, $q_3$) -> q3(`1,2`)
}
```

```
\begin{tikzpicture}[shorten >=1pt,node distance=2cm,on grid,auto]
    \node[state,initial] (q0) {$q_0$};
    \node[state] (q1) [right=of q0] {$q_1$};
    \node[state,accepting] (q2) [below=of q1] {$q_2$};
    \node[state,accepting] (q3) [below=of q0] {$q_3$};
    \path[->]
    (q0) edge node {$0$} (q1)
    (q0) edge node {$1,2$} (q3)
    (q1) edge node {$0$} (q2)
    (q2) edge node {$1,2$} (q3)
    (q2) edge [loop below] node {$0$} (q2)
    (q3) edge [loop below] node {$1,2$} (q3);
\end{tikzpicture}
```

![cube](./images/cube.png)

#### TODO: untitled

```
define StateMachine m {
    q0(s, $q_0$) -> q1(`0`), q2(`1`)
    q1(f, $q_1$) -> q1(`0`), q3(`1`)
    q2(f, $q_2$) -> q2(`1`), q4(`0`)
    q3(n, $q_3$) -> q1(`0`)
    q4(n, $q_4$) -> q2(`1`)
}
```

```
\begin{tikzpicture}[shorten >=1pt,node distance=2cm,on grid,auto]
    \node[state,initial] (q0) {$q_0$};
    \node[state,accepting] (q1) [above right=of q0] {$q_1$};
    \node[state,accepting] (q2) [below right=of q0] {$q_2$};
    \node[state](q3) [right=of q1] {$q_3$};
    \node[state](q4) [right=of q2] {$q_4$};
    \path[->]
    (q0) edge node {0} (q1)
        edge node [swap] {1} (q2)
    (q1) edge [bend left] node {1} (q3)
        edge [loop above] node {0} ()
    (q2) edge [bend left] node {0} (q4)
        edge [loop below] node {1} ()
    (q3) edge [bend left] node {0} (q1)
    (q4) edge [bend left] node {1} (q2);
\end{tikzpicture}
```

![untitled](./images/untitled.png)

#### Tree

```
define StateMachine m {
    a(s) -> b(`0`), e($\epsilon$), h(`0`)
    b -> c($\epsilon$)
    c -> d(`1`)
    d(f)
    e -> f(`1`), g(`1`)
    h -> i(`1`)
    i -> j($\epsilon$)
    j -> k($\epsilon$)
}
```

```
\begin{tikzpicture}[shorten >=1pt,node distance=2cm,on grid,auto]
    \node[state,initial] (a) {$a$};
    \node[state] (b) [above right=of a] {$b$};
    \node[state] (c) [above right=of b] {$c$};
    \node[state,accepting] (d) [right=of c] {$d$};
    \node[state] (e) [right=of a] {$e$};
    \node[state] (f) [above right=of e] {$f$};
    \node[state] (g) [right=of e] {$g$};
    \node[state] (h) [below right=of a] {$h$};
    \node[state] (i) [right=of h] {$i$};
    \node[state] (j) [right=of i] {$j$};
    \node[state] (k) [right=of j] {$k$};
    \path[->]
    (a) edge node {0} (b)
        edge node {$\epsilon$} (e)
        edge node {0} (h)
    (b) edge node {$\epsilon$} (c)
    (c) edge node {1} (d)
    (e) edge node {1} (f)
        edge node {1} (g)
    (h) edge node {1} (i)
    (i) edge node {$\epsilon$} (j)
    (j) edge node {$\epsilon$} (k);
\end{tikzpicture}
```

![tree](./images/tree.png)

#### Complex

```
define StateMachine m {
    q0(s, $q_0$) -> q1($\epsilon, \epsilon \rightarrow \$$)
    q1(n, $q_1$) -> q2($a, \epsilon \rightarrow a$), q2($b, \epsilon \rightarrow b$)
    q2(n, $q_2$) -> q3($a, \epsilon \rightarrow a$), q3($b, \epsilon \rightarrow b$)
    q2 -> q6($\epsilon \rightarrow \epsilon$), q6($b, \epsilon \rightarrow \epsilon$)
    q3(n, $q_3$) -> q4($a, \epsilon \rightarrow a$), q4($b, \epsilon \rightarrow b$)
    q4(n, $q_4$) -> q5($a, a \rightarrow \epsilon$), q5($b, b \rightarrow \epsilon$), q1($\epsilon, \epsilon \rightarrow \epsilon$)
    q5(n, $q_5$) -> q6($a, a \rightarrow \epsilon$), q6($b, b \rightarrow \epsilon$)
    q6(n, $q_6$) -> q7($a, a \rightarrow \epsilon$), q7($b, b \rightarrow \epsilon$)
    q7(n, $q_7$) -> q8($\epsilon, \$ \rightarrow \epsilon$), q5($a, a \rightarrow \epsilon$), q5($b, b \rightarrow \epsilon$)
    q8(f, $q_8$)
}
```

```
\begin{tikzpicture}[shorten >=1pt,node distance=2.8cm,on grid,auto]
    \node[state,initial] (q0) {$q_0$};
    \node[state] (q1) [right=of q0] {$q_1$};
    \node[state] (q2) [right=of q1] {$q_2$};
    \node[state] (q3) [right=of q2] {$q_3$};
    \node[state] (q4) [right=of q3] {$q_4$};
    \node[state] (q5) [below left=of q4] {$q_5$};
    \node[state] (q6) [left=of q5] {$q_6$};
    \node[state] (q7) [left=of q6] {$q_7$};
    \node[state,accepting] (q8) [left=of q7] {$q_8$};
    \path[->]
    (q0) edge node {$\epsilon, \epsilon \rightarrow \$$} (q1)
    (q1) edge node {$a, \epsilon \rightarrow a$} (q2)
         edge node [below] {$b, \epsilon \rightarrow b$} (q2)
    (q2) edge node {$a, \epsilon \rightarrow a$} (q3)
         edge node [below] {$b, \epsilon \rightarrow b$} (q3)
         edge node [left] {$a, \epsilon \rightarrow \epsilon$} (q6)
         edge node {$b, \epsilon \rightarrow \epsilon$} (q6)
    (q3) edge node {$a, \epsilon \rightarrow a$} (q4)
         edge node [below] {$b, \epsilon \rightarrow b$} (q4)
    (q4) edge node [above left] {$a, a \rightarrow \epsilon$} (q5)
         edge node {$b, b \rightarrow \epsilon$} (q5)
         edge [bend right] node [above] {$\epsilon, \epsilon \rightarrow \epsilon$} (q1)
    (q5) edge node [above] {$a, a \rightarrow \epsilon$} (q6)
         edge node {$b, b \rightarrow \epsilon$} (q6)
    (q6) edge node [above] {$a, a \rightarrow \epsilon$} (q7)
         edge node {$b, b \rightarrow \epsilon$} (q7)
    (q7) edge node {$\epsilon, \$ \rightarrow \epsilon$} (q8)
         edge [bend right] node {$a, a \rightarrow \epsilon$} (q5)
         edge [bend right] node [below] {$b, b \rightarrow \epsilon$} (q5);
\end{tikzpicture}
```

![complex](./images/complex.png)

### Merge State Machine

```
merge StateMachine m2 m1 as m3 {
    m1.q1(s)
    m1.q2 -> m2.q3
    m2.q1 -> m1.q4
}
```
