# encoding: utf-8
from __future__ import annotations

import re
from copy import deepcopy
# (canada fork only): handle all errors in resource actions
# TODO: upstream contrib??
from typing import Any, Mapping, cast, Tuple, Dict


from ckan.logic import NotFound
from ckan.common import _
from ckan.model.domain_object import DomainObject
from ckan.types import ErrorDict, Model


def rename_keys(dict_: dict[str, Any],
                key_map: Mapping[str, Any],
                reverse: bool = False,
                destructive: bool = False) -> dict[str, Any]:
    '''Returns a dict that has particular keys renamed,
    according to the key_map.

    Rename is by default non-destructive, so if the intended new
    key name already exists, it won\'t do that rename.

    To reverse the change, set reverse=True.'''
    new_dict = deepcopy(dict_)
    for key, mapping in key_map.items():
        if reverse:
            key, mapping = (mapping, key)
        if (not destructive) and mapping in new_dict:
            continue
        if key in dict_:
            value = dict_[key]
            new_dict[mapping] = value
            del new_dict[key]
    return new_dict


def get_domain_object(model: Model, domain_object_ref: str) -> DomainObject:
    '''For an id or name, return the corresponding domain object.
    (First match returned, in order: system, package, group, auth_group, user).
    '''
    if domain_object_ref in ('system', 'System'):
        return model.System()
    pkg = model.Package.get(domain_object_ref)
    if pkg:
        return pkg
    group = model.Group.get(domain_object_ref)
    if group:
        return group
    user = model.User.get(domain_object_ref)
    if user:
        return user
    raise NotFound('Domain object %r not found' % domain_object_ref)


def error_summary(error_dict: ErrorDict) -> dict[str, str]:
    ''' Do some i18n stuff on the error_dict keys '''

    def prettify(field_name: str):
        field_name = re.sub(r'(?<!\w)[Uu]rl(?!\w)', 'URL',
                            field_name.replace('_', ' ').capitalize())
        return _(field_name.replace('_', ' '))

    summary: dict[str, str] = {}
    for key, error in cast("dict[str, list[str]]", error_dict).items():
        if key == 'resources':
            summary[_('Resources')] = _('Package resource(s) invalid')
        elif key == 'extras':
            summary[_('Extras')] = _('Missing Value')
        elif key == 'extras_validation':
            summary[_('Extras')] = error[0]
        else:
            summary[_(prettify(key))] = error[0]
    return summary


# (canada fork only): handle all errors in resource actions
# TODO: upstream contrib??
def resource_validation_errors(
        error_dict: ErrorDict,
        action: str,
        pkg_dict: Dict[str, Any],
        resource_index: int = -1) -> Tuple[Dict[str, str], str]:
    """
    Checks through the error_dict to find all errors in
    the Dataset and its Resources.
    """
    new_error_dict = dict(error_dict)
    try:
        if action == 'delete':
            # special case for deleting as there is no index
            # for a non-existent resource in the pkg_dict.
            current_res_error_dict = False
        else:
            current_res_error_dict = cast("list[ErrorDict]", error_dict['resources'])[resource_index]
        if not current_res_error_dict and 'resources' in error_dict and isinstance(error_dict['resources'], list):
            new_error_dict = {'errors': {'resources': {}}}
            new_error_dict['action'] = action
            for key, res_error_dict in enumerate(error_dict['resources']):
                if key <= len(pkg_dict['resources']):
                    errored_resource = pkg_dict['resources'][key]
                    if errored_resource.get('id'):
                        new_error_dict['errors']['resources'][errored_resource.get('id')] = res_error_dict
                        new_error_dict['other_resource'] = True
    except (KeyError, IndexError):
        new_error_dict = dict(error_dict)
    return new_error_dict
