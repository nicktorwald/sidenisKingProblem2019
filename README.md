# The king problem 2019 by Sidenis

## Brief

Implement **constructor function or ES6-class** that has name **VirtualDOM** using JavaScript specification and
appropriate browser API supported by **Chromium 77.0.3874.0 (r674921)**.

The provided solution is checked using a set of 56 tests. There is a time limit of 10s for a test. Penalty is added each
time a test fails (not *AC*) and equals 30s for the scripting + 30s for the rendering. 

The solution can be sent unlimited times. The best solution is a script which passes all the tests spent less time than
others.

### Test result statuses

Name | Description
-----|--------------
WA   | Wrong answer
TL   | Time limit
AC   | Accepted
RE   | Runtime error

## King problem

Implement *constructor function or ES6-class* named *VirtualDOM*. Created instances using `new VirtualDOM()` have
to follow next interface:

```typescript
interface VirtualDOM {
    create(tagName: string,
           attributes: Attributes,
           children: (VNode | string)[]) : VNode;

    update(rootNode: Node,
           rootVNode: VNode) : void
}

interface VNode {
    tagName: string;
    attributes: Attributes;
    children: (VNode | string)[];
}

interface Attributes {
    [name: string]: string | number | boolean;
}
```

`VirtualDOM.create` method is used to produce new nodes of a virtual DOM tree. If an element of `children` is a string, a
child text node must be created.

`VirtualDOM.update` is used to refresh a state of a virtual DOM tree comparing the DOM-tree root (`rootNode`) and the
virtual DOM-tree root (`rootVNode`). The `rootNode` param is always defined and attached to the real DOM tree
(`document`).

Let's consider an example:

```typescript
const rootNode = document.createElement('DIV');
document.body.appendChild(rootNode);

const virtualDOM = new VirtualDOM();

const rootVNode =
    virtualDOM.create('DIV', null, [
        virtualDOM.create('SPAN',
            {style: 'color: red;'},
            ['Span']),
        virtualDOM.create('BUTTON',
            {disabled: true},
            ['Button'])
    ]);

virtualDOM.update(rootNode, rootVNode);
```

As a result, the final DOM-tree has to be like:

```html
<body>
    <div>
        <span style="color: red;">Span</span>
        <button>Button</button>
    </div>
</body>
```

You need to properly handle all modifications of a real DOM-tree spent as little time as possible on a script execution
and a browser DOM rendering as well.

## Solution

The complete solution is located at `solution.js` file. Here is a simplified concept. The main idea is to make a fast
update, it is required to perform minimal DOM reading and writing operations. This goal is achieved using the following
optimizations:

* Don't touch nodes attached to the `document`. Instead, use a copy of previous virtual DOM and perform
  comparison between two virtual trees*.
* Don't render a virtual sub-tree upon an attached node. It is better to render the sub-tree using a detached root and
  once it is done attach all rendered nodes to a real DOM by a single operation. 
* Don't use a DFS-like matching, prefer BFS. If current comparing nodes have different types (tag names) then render the
  new virtual sub-tree instantly without deep diving.
* Don't match children serially with others (at least, try to consider some corner cases before). It is worth using
  a few small heuristics that work well in special cases (for instance, insertion or removal of the first child). And if
  none of them works use the serial approach as the worst case. To perform such matching, it's required to use a
  concept of node keys where each virtual node is marked by unique key internally within a creation process**.

*This solution uses theoretically expensive invocations of `Node.firstChild` and `Node.nextSibling` properties to
traverse through a DOM-tree. There is one more optimization that allows us to avoid the traversal and lies in the fact
keeping references of DOM nodes in a pair with virtual ones. Hoverer, this practice was not implemented and tested and
might have not boosted performance.

**Most of the heuristics were inspired by [ivi reconciler](https://github.com/localvoid/ivi/blob/c004b94d25b8772303de3068f133f5e5a92df4c2/packages/ivi/src/vdom/reconciler.ts#L578).
Though, some of them were skipped because of a lack of positive effect on performance for the tests.
