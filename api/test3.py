as_bytearrays = [(bytearray(b'GQVqU0fDoQj_zDe_uIv5FA1'), bytearray(b't1'), bytearray(b'v1')), (bytearray(b'GQVqU0fDoQj_zDe_uIv5FA2'), bytearray(b't2'), bytearray(b'v2'))]
as_utf8 = []
for b in as_bytearrays:
    as_utf8.append(tuple([str.decode('utf-8') for str in b]))
