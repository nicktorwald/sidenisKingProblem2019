function VirtualDOM() {
    this.vSnapshot;
    this.key = 1;

    this.create = function (tagName, attributes, children) {
        return {
            tagName,
            attributes: attributes || {},
            children,
            key: this.key++
        };
    };

    this.update = function ($container, vRoot) {
        if (this.vSnapshot) {
            this.diff($container, this.vSnapshot, vRoot);
        } else {
            $container.replaceWith(this.render(vRoot));
        }
        this.vSnapshot = this.copy(vRoot);
    };

    /**
     * Clones the given object recursively.
     *
     * @param clone object to be cloned
     * @returns cloned object
     */
    this.copy = function (clone) {
        let out,
            value;
        if (Array.isArray(clone)) {
            out = [];
            for (let i = 0, size = clone.length; i < size; i++) {
                value = clone[i];
                out[i] = (typeof value === "object") ? this.copy(value) : value;
            }
        } else {
            out = {};
            for (let key in clone) {
                value = clone[key];
                out[key] = (typeof value === "object") ? this.copy(value) : value;
            }
        }
        return out;
    };

    /**
     * Renders the given virtual node.
     *
     * @param vNode virtual node to be rendered
     * @returns rendered DOM element or text node
     */
    this.render = function (vNode) {
        if (typeof (vNode) === 'string') {
            return document.createTextNode(vNode);
        }
        return this.renderElement(vNode);
    };

    /**
     * Renders the given virtual node, its attributes, and
     * its children nodes.
     *
     * @param tagName    name of element
     * @param attributes set of element attributes
     * @param children   list of element children
     * @returns rendered DOM element
     */
    this.renderElement = function ({tagName, attributes, children}) {
        const $node = document.createElement(tagName);
        let key,
            value;
        for (key in attributes) {
            value = attributes[key];
            if (!value) {
                $node.removeAttribute(key);
            } else if (value === true) {
                $node.setAttribute(key, '');
            } else {
                $node.setAttribute(key, value);
            }
        }
        for (let i = 0, size = children.length; i < size; i++) {
            $node.appendChild(this.render(children[i]));
        }
        return $node;
    };

    /**
     * Calculates a diff between two virtual nodes and
     * applies this patch to the target DOM node.
     *
     * @param $node    target node to be processed
     * @param vOldNode old version of node
     * @param vNewNode new version of node
     * @returns modified node
     */
    this.diff = function ($node, vOldNode, vNewNode) {
        if (typeof vOldNode === 'string' || typeof vNewNode === 'string') {
            if (vOldNode !== vNewNode) {
                const $base = this.render(vNewNode);
                $node.replaceWith($base);
                return $base;
            }
        } else if (vOldNode.tagName !== vNewNode.tagName) {
            const $base = this.render(vNewNode);
            $node.replaceWith($base);
            return $base;
        } else {
            this.diffAttributes($node, vOldNode.attributes, vNewNode.attributes);
            this.diffChildren($node, vOldNode.children, vNewNode.children);
        }
        return $node;
    };

    /**
     * Calculates a diff between two sets of attributes and
     * applies this patch to the given DOM node.
     *
     * @param $node          target node to be modified
     * @param vOldAttributes old version of attributes
     * @param vNewAttributes new version of attributes
     */
    this.diffAttributes = function ($node, vOldAttributes, vNewAttributes) {
        let key,
            value;
        for (key in vNewAttributes) {
            value = vNewAttributes[key];
            if (!value) {
                $node.removeAttribute(key);
            } else if (value === true) {
                $node.setAttribute(key, '');
            } else {
                $node.setAttribute(key, value);
            }
        }
        for (key in vOldAttributes) {
            if (!(key in vNewAttributes)) {
                $node.removeAttribute(key);
            }
        }
    };

    /**
     * Calculates a diff between two lists of children and
     * applies this patch to the given DOM parent node.
     *
     * @param $node        parent node to be processed
     * @param vOldChildren old version of children list
     * @param vNewChildren new version of children list
     */
    this.diffChildren = function ($node, vOldChildren, vNewChildren) {
        // H1.1: no new nodes -> just remove old ones
        if (vNewChildren.length === 0) {
            $node.textContent = '';
            return;
        }
        // H1.2: no old nodes -> just append new ones
        if (vOldChildren.length === 0) {
            for (let i = 0, size = vNewChildren.length; i < size; i++) {
                $node.appendChild(this.render(vNewChildren[i]))
            }
            return;
        }

        let $child = $node.firstChild,
            $children = [];
        while ($child) {
            $children.push($child);
            $child = $child.nextSibling;
        }

        let oldStart = 0,
            oldEnd = vOldChildren.length - 1,
            newStart = 0,
            newEnd = vNewChildren.length - 1,
            loop = true,
            vOldChild,
            vNewChild,
            $afterNode,
            $oldStartNode = $children[oldStart],
            $newStartNode = $oldStartNode,
            $oldEndNode = $children[oldEnd];

        // H2 cases family tries to eliminate sequentially
        // repeated patterns from the both ends of two lists
        outer: while (loop) {
            loop = false;

            // H2.1: skip common prefix nodes
            // a: [a b c d e f g]
            // b: [a b c g e f d]
            // prefix: [a b c d]
            vOldChild = vOldChildren[oldStart];
            vNewChild = vNewChildren[newStart];
            while (vOldChild === vNewChild || vOldChild.key === vNewChild.key) {
                this.diff($oldStartNode, vOldChild, vNewChild);
                oldStart++;
                newStart++;
                $newStartNode = $oldStartNode = $children[oldStart];
                if (oldEnd < oldStart || newEnd < newStart) {
                    break outer;
                }
                vOldChild = vOldChildren[oldStart];
                vNewChild = vNewChildren[newStart];
            }

            // H2.2: skip common suffix nodes
            // a: [a b c d e f g]
            // b: [d b c a e f g]
            // suffix: [e f g]
            vOldChild = vOldChildren[oldEnd];
            vNewChild = vNewChildren[newEnd];
            while (vOldChild === vNewChild || vOldChild.key === vNewChild.key) {
                $afterNode = this.diff($oldEndNode, vOldChild, vNewChild);
                oldEnd--;
                newEnd--;
                $oldEndNode = $children[oldEnd];
                if (oldEnd < oldStart || newEnd < newStart) {
                    break outer;
                }
                vOldChild = vOldChildren[oldEnd];
                vNewChild = vNewChildren[newEnd];
            }

            // H2.4: skip common inverted sequence nodes
            // a: [a b c d e f g]
            // b: [g f d e b a c]
            // common sequence: [g f]
            vOldChild = vOldChildren[oldEnd];
            vNewChild = vNewChildren[newStart];
            while (vOldChild === vNewChild || vOldChild.key === vNewChild.key) {
                loop = true;
                $oldEndNode = this.diff($oldEndNode, vOldChild, vNewChild);
                $newStartNode.before($oldEndNode);
                newStart++;
                oldEnd--;
                $oldEndNode = $children[oldEnd];
                if (oldEnd < oldStart || newEnd < newStart) {
                    break outer;
                }
                vOldChild = vOldChildren[oldEnd];
                vNewChild = vNewChildren[newStart];
            }

            // H2.4: skip common inverted sequence nodes
            // a: [a b c d e f g]
            // b: [f e g d c b a]
            // common sequence: [a b c]
            vOldChild = vOldChildren[oldStart];
            vNewChild = vNewChildren[newEnd];
            while (vOldChild === vNewChild || vOldChild.key === vNewChild.key) {
                loop = true;
                $oldStartNode = this.diff($oldStartNode, vOldChild, vNewChild);
                $afterNode.before($oldStartNode);
                oldStart++;
                newEnd--;
                $afterNode = $oldStartNode;
                $oldStartNode = $children[oldStart];
                if (oldEnd < oldStart || newEnd < newStart) {
                    break outer;
                }
                vOldChild = vOldChildren[oldStart];
                vNewChild = vNewChildren[newEnd];
            }
        }
        // H2.5: all new nodes processed but some of old nodes may be unprocessed -> remove them all
        if (newEnd < newStart) {
            while (oldStart <= oldEnd) {
                $children[oldEnd--].remove();
            }
            return;
        }
        // H2.6: all old nodes processed but some of new nodes may be unprocessed -> insert them all
        if (oldEnd < oldStart) {
            while (newStart <= newEnd) {
                if ($afterNode) {
                    $node.insertBefore(this.render(vNewChildren[newStart]), $afterNode)
                } else {
                    $node.appendChild(this.render(vNewChildren[newStart]));
                }
                newStart++;
            }
            return;
        }

        // if there are unprocessed nodes -> remove old nodes, insert new nodes
        for (let i = oldStart; i <= oldEnd; i++) {
            $children[i].remove();
        }
        for (let i = newStart; i <= newEnd; i++) {
            if ($afterNode) {
                $afterNode.before(this.render(vNewChildren[i]));
            } else {
                $node.appendChild(this.render(vNewChildren[i]));
            }
        }
    };
}
