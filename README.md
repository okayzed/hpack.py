## hpack

in 2011, I used hpack as a technique for compressing repeated JSON information.
this is an excerpt of that code. 

hpack takes an array of repeated objects and translates the objects into
arrays. it works well when the array of data is mostly homogenous but also
works with heterogenous objects

the initial implementation was written in python and then ported to javascript

## usage

```python
a = { }; // `a` is some object
lookup = hpack.pack_keys(a);
packed = hpack.pack(a, lookup)
unpacked = hpack.unpack(packed, lookup);
```

```javascript
var hpack = require("./hpack");
a = {}; // `a` is some object
lookup = hpack.pack_keys(a);
packed = hpack.pack(a, lookup)
unpacked = hpack.unpack(packed, lookup);
```




### related stuff

* https://github.com/WebReflection/json.hpack
* https://github.com/WebReflection/JSONH
* http://michaux.ca/articles/json-db-a-compressed-json-format
