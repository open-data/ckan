from ckan.plugins.toolkit import get_action, h


VALIDATE_DEFINITION_SQL = u'''
<<validation>>
DECLARE
  errors text[] := '{{}}';
BEGIN
  {validate_rules}
  IF errors = '{{}}' THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION E'TAB-DELIMITED\\t%', array_to_string(errors, E'\\t');
END;
'''


def create_table(resource_id, info):
    '''
    Set up datastore table + validation
    '''
    primary_key = []
    validate_rules = []
    for f in info:
        colname, tdtype = f['id'], f['tdtype']
        ct = h.tabledesigner_column_type(tdtype)

        if f.get('pkreq') == 'pk':
            primary_key.append((colname, tdtype))

        req_validate = ct.sql_required_rule(f)
        if req_validate:
            validate_rules.append(req_validate)

        col_validate = ct.sql_validate_rule(f)
        if col_validate:
            validate_rules.append(col_validate)

        for cc in h.tabledesigner_column_constraints(tdtype):
            cc_validate = cc.sql_constraint_rule(f, ct)
            if cc_validate:
                validate_rules.append(cc_validate)

    if validate_rules:
        validate_def = VALIDATE_DEFINITION_SQL.format(
            validate_rules=''.join(validate_rules),
        )
        get_action('datastore_function_create')(
            {
                'ignore_auth': True,
            },
            {
                'name': u'{0}_tabledesigner_validate'.format(resource_id),
                'or_replace': True,
                'rettype': u'trigger',
                'definition': validate_def,
            }
        )

    get_action('datastore_create')(
        None, {
            'resource_id': resource_id,
            'force': True,
            'primary_key': [f for f, typ in primary_key],
            'fields': [{
                'id': i['id'],
                'type':
                    h.tabledesigner_column_type(i['tdtype']).datastore_type,
                'info': {
                    k: v for (k, v) in i.items()
                    if k != 'id'
                },
            } for i in info],
            'triggers': [
                {'function': u'{0}_tabledesigner_validate'.format(resource_id)}
            ] if validate_rules else [],
        }
    )
