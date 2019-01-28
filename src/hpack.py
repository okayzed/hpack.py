from __future__ import print_function

def get_ns(ns, ts): 
    if ns:
        return "%s.%s" % (ns, ts)
    else:
        return ts


def translate_array(arr, translation_key, drop_zeroes=False):
    for a in arr:
        if isinstance(a, (list, tuple)):
            translate_array(a, translation_key, drop_zeroes)
        if isinstance(a, (dict)):
            translate_dict(a, translation_key, drop_zeroes)

# a recursive strategy to replace dictionaries with
# dictionaries that have their keys translated.
def translate_dict(d, translation_key, drop_zeroes=False):
    for k in d.keys():
        v = d[k]

        if v == 0 and drop_zeroes:
            del d[k]
            continue

        if k in translation_key:
            d[translation_key[k]] = v
            del d[k]
        if isinstance(v, (list, tuple)):
            translate_array(v, translation_key, drop_zeroes)
        if isinstance(v, (dict)):
            translate_dict(v, translation_key, drop_zeroes)

def key_merge(lookup, other_lookup):
    sub_keys = set(lookup.keys()) | set(other_lookup.keys())
    sorted_keys = sorted(list(sub_keys))
    for k in range(len(sorted_keys)):
        lookup[sorted_keys[k]] = k

# To turn a dict into a table, we have to determine table
# properties - this recurses through arrays and dicts,
# figuring out the table columns.
def determine_keys(arr_data, ns=""):
    keys = set()
    types_seen = set()
    max_count = 0
    for d in arr_data:
        types_seen.add(type(d))
        t = type(d)
        if t not in (dict, list, tuple):
            return None, None
        if len(types_seen) >= 2:
            return None, None

        if type(d) == dict:
            keys.update(set(d.keys()))
        else:
            max_count = max(len(d), max_count)

    key_lookups = {}
    if not keys:
        sorted_keys = range(0, max_count)
    else:
        sorted_keys = list(keys)
        sorted_keys.sort()

    for d in arr_data:
        for k in sorted_keys:
            ts = get_ns(ns, k)

            try:
                val = d[k]
            except Exception as e:
                val = None

            if isinstance(val, (dict)):
                val = [val]

            if isinstance(val, (list, tuple)):
                sub_key_lookup, sub_key_lookups = determine_keys(val, ts)

                # Have to do key merges:
                if sub_key_lookup:
                    kl = key_lookups.get(ts, {})
                    key_merge(sub_key_lookup, kl)
                    kl.update(sub_key_lookup)
                    key_lookups[ts] = kl

                if sub_key_lookups:
                    for kk in sub_key_lookups:
                        kl = key_lookups.get(kk, {})
                        key_merge(sub_key_lookups[kk], kl)
                    key_lookups.update(sub_key_lookups)

    this_lookup = {}
    for i in range(len(sorted_keys)):
        this_lookup[sorted_keys[i]] = i

    return this_lookup, key_lookups


def pack_keys(arr_data):
    k, sk = determine_keys(arr_data)
    sk[''] = k
    return sk
# Horizontal pack the world turns and ai_data from an array of dicts into a table format. This is done using keys returned from determine_keys.

def pack(arr_data, sub_key_lookup, ns=""):
    this_lookup = sub_key_lookup.get(ns, {})
    # Collect the keys, first:
    new_arr_data = []


    for d in arr_data:
        if not isinstance(d, (list, tuple, dict)):
            row = d

        else:
            row = [None]*len(this_lookup)
            for k in this_lookup:
                ts = get_ns(ns, k)
                val = None

                try:
                    val = d[k]
                except Exception as e:
                    pass

                boxed = False
                if isinstance(val, (dict)):
                    val = [val]
                    boxed = True

                if isinstance(val, (list, tuple)):
                    val = pack(val, sub_key_lookup, ts)

                if boxed:
                    val = val.pop()

                row[this_lookup[k]] = val

        new_arr_data.append(row)

    return new_arr_data

def unpack(arr_data, sub_key_lookup, ns=""):
    this_lookup = sub_key_lookup.get(ns, {})
    new_arr_data = []
    inverse_lookup = {} # lookup from field ID to key name
    for k, v in this_lookup.items():
        inverse_lookup[v] = k

    for d in arr_data:
        r = {}
        for i, c in enumerate(d):
            k = inverse_lookup[i]

            if c is not None:
                r[k] = c

            ts = get_ns(ns, k)
            if isinstance(c, list) and sub_key_lookup.get(ts, None):
                t = unpack([c], sub_key_lookup, ts)[0]
                r[k] = t

        new_arr_data.append(r)

    return new_arr_data
