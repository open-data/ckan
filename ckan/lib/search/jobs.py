# encoding: utf-8

# (canada fork only): background search index rebuilding
#TODO: upstream contrib!!

import json
import datetime
from rq import get_current_job

import ckan.logic as logic
import ckan.lib.search as search
import ckan.model as model

from ckan.plugins import toolkit

from logging import getLogger
log = getLogger(__name__)


def reindex_packages(package_ids=None, group_id=None):
    context = {
        'model': model,
        'ignore_auth': True,
        'validate': False,
        'use_cache': False
    }

    _entity_id = group_id if group_id else toolkit.config.get('ckan.site_id')
    task = {
        'entity_id': _entity_id,
        'entity_type': 'group' if group_id else 'site',
        'task_type': 'reindex_packages',
        'last_updated': str(datetime.datetime.now(datetime.timezone.utc)),
        'state': 'running',
        'key': 'search_rebuild',
        'value': '{}',
        'error': '{}',
    }

    try:
        task = logic.get_action('task_status_show')(context, {'entity_id': _entity_id,
                                                              'task_type': 'reindex_packages',
                                                              'key': 'search_rebuild'})
        task['state'] = 'running'
        task['last_updated'] = str(datetime.datetime.now(datetime.timezone.utc))
        logic.get_action('task_status_update')({'session': model.meta.create_local_session(), 'ignore_auth': True}, task)
    except logic.NotFound:
        pass

    value = json.loads(task.get('value', '{}'))
    error = json.loads(task.get('error', '{}'))

    value['job_id'] = get_current_job().id

    for _dataset_id, _total, _indexed, _error in search.rebuild(force=True, package_ids=package_ids):
        if not _error:
            log.info('[%s/%s] Indexed dataset %s' % (_indexed, _total, _dataset_id))
        else:
            log.error('[%s/%s] Failed to index dataset %s with error: %s' % (_indexed, _total, _dataset_id, _error))
        value['indexed'] = _indexed
        value['total'] = _total
        if _error:
            error[_dataset_id] = _error
        task['value'] = json.dumps(value)
        task['last_updated'] = str(datetime.datetime.now(datetime.timezone.utc))
        logic.get_action('task_status_update')({'session': model.meta.create_local_session(), 'ignore_auth': True}, task)

    task['state'] = 'complete'
    task['last_updated'] = str(datetime.datetime.now(datetime.timezone.utc))
    logic.get_action('task_status_update')({'session': model.meta.create_local_session(), 'ignore_auth': True}, task)
