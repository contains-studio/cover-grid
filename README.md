# Cover Grid

Cover Grid is a deterministic, browser-based layout tool for square podcast
artwork. It keeps backgrounds and typography separate, measures every text
layer, displays alignment grids and safe areas, and exports a 3000×3000 PNG or
JPEG without generative image editing.

**Live tool:** [alreadyhere.show/tools/layout](https://alreadyhere.show/tools/layout/)

## Run

From this repository:

```bash
python3 -m http.server 4173
```

Then open <http://localhost:4173/>.

The default preset recreates the Already Here Utopia cover. Layout changes are
stored in the browser and can also be downloaded as JSON.

The editor bundles seven export-safe typefaces: Anton, Bebas Neue, Archivo
Black, Oswald, League Spartan, Space Grotesk, and Montserrat.

## Alignment model

- `x` is the mathematical center of a text layer.
- `optical offset` is an explicit left/right correction applied after centering.
- The inspector reports the actual rendered left edge, center, right edge, and
  distance from both canvas edges.
- Center, 12-column, 100-pixel, and podcast safe-area grids can be toggled.

## Legacy flattened art

`scripts/strip_dark_text.py` is a deterministic migration helper that removes
dark text from tightly scoped rectangles. It exists only for old flattened
artwork; future covers should use a clean background from the start.

## License

Application code is MIT licensed. Bundled fonts are distributed under the SIL
Open Font License; see `fonts/OFL-LICENSE.txt`.
