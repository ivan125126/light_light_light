import{ifNaN as t}from"../util/internals/ifNaN.min.mjs";import{capValue as i}from"../util/misc/capValue.min.mjs";function r(t){return t&&/%$/.test(t)&&Number.isFinite(parseFloat(t))}function n(n,e){const o="number"==typeof n?n:"string"==typeof n?parseFloat(n)/(r(n)?100:1):NaN;return i(0,t(o,e),1)}export{r as isPercent,n as parsePercent};
//# sourceMappingURL=percent.min.mjs.map
