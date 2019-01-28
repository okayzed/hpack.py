"use strict";

function get_ns(ns, ts) {
  if (ns) { return ns + "." + ts; }
  return ts;
}

function isObject(a) { return (!!a) && (a.constructor === Object); }
function isArray(a) { return (!!a) && (a.constructor === Array); }

function listKeys(o) {
  var keys = [];
  for (var k in o) {
    if (!o.hasOwnProperty(k)) { continue; }
    keys.push(k);
  }

  return keys;
}

function range(s, e) { var a = []; for (var i = s; i < e; i++) { a.push(i); } return a; }

function key_merge(lookup, other_lookup) {
    lookup = lookup || {};
    var sub_keys = {}, k;
    for (k in lookup) { sub_keys[k] = 1; }
    for (k in other_lookup) { sub_keys[k] = 1; }

    var sorted_keys = [];
    for (k in sub_keys) { sorted_keys.push(k); }
    sorted_keys.sort();

    for (k in sorted_keys) { lookup[sorted_keys[k]] = k; }

    return lookup;
}

// To turn a dict into a table, we have to determine table
// properties - this recurses through arrays and dicts,
// figuring out the table columns.
function determine_keys(arr_data, ns) {
    var keys = {};
    var max_count = 0;
    for(var d in arr_data) {
      d = arr_data[d];

      if (!(isObject(d) || isArray(d))) {
          return [{}, {}];
      }

      if (isObject(d)) {
          key_merge(keys, d);
      } else {
          max_count = Math.max(d.length, max_count);
      }
    }

    var key_lookups = {};
    var sorted_keys;
    if (!listKeys(keys).length) {
        sorted_keys = range(0, max_count);
    } else {
        sorted_keys = listKeys(keys);
        sorted_keys.sort();
    }

    var val, ts;
    for (var d in arr_data) {
        d = arr_data[d];

        for (var k in sorted_keys) {
            k = sorted_keys[k];
            ts = get_ns(ns, k);

            try {
                val = d[k];
            } catch (e) {
                val = null;
            }

            if (isObject(val)) {
                val = [val];
            }

            if (isArray(val)) {
                var r = determine_keys(val, ts);
                var sub_key_lookup = r[0], sub_key_lookups = r[1];

                // Have to do key merges:
                if (sub_key_lookup) {
                    sub_key_lookup = key_merge(sub_key_lookup, key_lookups[ts]);
                    key_lookups[ts] = key_merge(key_lookups[ts], sub_key_lookup);
                }

                if (sub_key_lookups) {
                    for (var kk in sub_key_lookups) {
                        key_lookups[kk] = key_merge(key_lookups[kk], sub_key_lookups[kk]);
                    }
                }
            }
        }
    }

    var this_lookup = {};
    for (var i in range(0, sorted_keys.length)) {
        this_lookup[sorted_keys[i]] = i;
    }

    return [this_lookup, key_lookups];
}


function pack_keys(arr_data) {
  var r = determine_keys(arr_data);
  var k = r[0], sk = r[1];
  sk[''] = k;

  for (var i in sk) {
    if (listKeys(sk[i]).length == 0) {
      delete sk[i];
    }
  }

  return sk;
}


//  Horizontal pack the world turns and ai_data from an array of dicts into a table format. This is done using keys returned from determine_keys.

function horizontal_pack(arr_data, sub_key_lookup, ns) {
    ns = ns || "";
    var this_lookup = sub_key_lookup[ns];
    //  Collect the keys, first:
    var new_arr_data = [];


    var val, ts;
    for (var d in arr_data) {
      d = arr_data[d];
      if (!(isObject(d) || isArray(d))) {
          row = d;
      } else {
          var row = [];
          row.length = listKeys(this_lookup).length;
          for (var k in this_lookup) {
              ts = get_ns(ns, k);

              val = d[k];

              var boxed = false;
              if (isObject(val)) {
                val = [val];
                boxed = true;
              }

              if (isArray(val)) {
                  val = horizontal_pack(val, sub_key_lookup, ts);
              }

              if (boxed) {
                  val = val.pop();
              }

              row[this_lookup[k]] = val;
          }
      }

      new_arr_data.push(row);
    }

    return new_arr_data;
}

function horizontal_unpack(arr_data, sub_key_lookup, ns) {
    ns = ns || "";
    var this_lookup = sub_key_lookup[ns];
    var new_arr_data = [];
    var inverse_lookup = {}; // lookup from field ID to key name
    for (var k in this_lookup) {
      var v = this_lookup[k];
      inverse_lookup[v] = k;
    }

    for (var d in arr_data) {
      d = arr_data[d];
      var r = {};
      for (var i in d) {
        var c = d[i];
        var k = inverse_lookup[i];
        var ts = get_ns(ns, k);

        if (c) { r[k] = c; }
        if (isArray(c) && listKeys(sub_key_lookup[ts]).length) {
          r[k] = horizontal_unpack([c], sub_key_lookup, ts)[0];
        }

      }
      new_arr_data.push(r);
    }

    return new_arr_data;
}


module.exports = {
  pack: horizontal_pack,
  unpack: horizontal_unpack,
  pack_keys: pack_keys
};
