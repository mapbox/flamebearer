# 🔥 flamebearer

_A work in progress._

Blazing fast [flame graph](http://www.brendangregg.com/flamegraphs.html) tool for Node and V8,
used to visualize and explore performance profiling results.
Designed to handle profiles of any size while remaining responsive.

## Usage

Use the [online version](https://mapbox.github.io/flamebearer/), or the command line tool:

```bash
# install flamebearer
$ npm install -g flamebearer

# profile your app
$ node --prof app.js

# generate flamegraph.html from a V8 log and open it in the browser
$ node --prof-process --preprocess isolate*.log | flamebearer
```

## Thanks

- [Brendan Gregg](http://brendangregg.com/) for creating the [concept](https://queue.acm.org/detail.cfm?id=2927301) and maintaining the [reference implementation](http://brendangregg.com/flamegraphs.html).
- [David Mark Clements](https://github.com/davidmarkclements) and [Matteo Collina](https://github.com/mcollina) for creating [0x](https://github.com/davidmarkclements/0x) which inspired this project.
- [Bernard Cornwell](http://www.bernardcornwell.net/books/) for the amazing books this project took its name from.
