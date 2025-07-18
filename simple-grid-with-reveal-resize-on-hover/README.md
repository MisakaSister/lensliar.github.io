# simple `grid` with reveal + resize on `hover`

A Pen created on CodePen.

Original URL: [https://codepen.io/mandynicole/pen/xxNYMLj](https://codepen.io/mandynicole/pen/xxNYMLj).

Simple grid prototype with various interaction points, originally designed for a content feed.

- Uses `clip-path` for better, cleaner border radii, especially in conjunction with transitions

- Utilizes `oklch` and `color-mix`

- Uses `container` to determine if/when to unwrap and `marquee`-ify tags

- Faux `marquee` that intentionally waits a beat before animating and pauses on `:hover`

- Uses `media` queries to determine whether card titles are `line-clamped` + `text-overflow: ellipsis;`'d or `flex-wrap: wrap;`

---

TODO:

- Implement keyboard navigation

- Create better `:focus` styles

- Fix faux marquee so it matches the true width of every `.tags--container`

- Add scroll functionality to `.tags--container` on `.tag:focus`

- Look into Chrome `clip-path` "overflow" issues

- See also: https://inclusive-components.design/cards/