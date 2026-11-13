# Ceviche

CSS / Element Variable Inspector _and_ Editor (CEVIchE) tools

WIP

## Targets

Mark the elements people should be able to select:

```html
<header data-ceviche-id="toolbar">
  <a data-ceviche-id="tab">News</a>
  <a data-ceviche-id="tab">Sport</a>
</header>
```

```ts
const tree = buildTargetTree(document.body)
tree.paths()           // ['toolbar', 'toolbar/tab[0]', 'toolbar/tab[1]']
tree.pathOf(element)!  // 'toolbar/tab[1]'
```

## Inspecting

```ts
const result = inspect(element)
for (const [variable, info] of result.variables) {
  variable         // '--toolbar-background'
  info.value       // computed value on the element
  info.count       // number of total uses across all stylesheets
}
```