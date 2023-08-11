# encoding: utf-8

import multiprocessing as mp

import click
import sqlalchemy as sa

import ckan.plugins.toolkit as tk
from ckan.lib.search import query_for
import ckan.logic as logic
import ckan.model as model


@click.group(name=u'search-index', short_help=u'Search index commands')
@click.help_option(u'-h', u'--help')
def search_index():
    pass


@search_index.command(name=u'rebuild', short_help=u'Rebuild search index')
@click.option(u'-v', u'--verbose', is_flag=True)
@click.option(u'-i', u'--force', is_flag=True,
              help=u'Ignore exceptions when rebuilding the index')
@click.option(u'-r', u'--refresh', help=u'Refresh current index', is_flag=True)
@click.option(u'-o', u'--only-missing',
              help=u'Index non indexed datasets only', is_flag=True)
@click.option(u'-q', u'--quiet', help=u'Do not output index rebuild progress',
              is_flag=True)
@click.option(u'-e', u'--commit-each', is_flag=True,
              help=u'Perform a commit after indexing each dataset. This'
                   u'ensures that changes are immediately available on the'
                   u'search, but slows significantly the process. Default'
                   u'is false.')
@click.argument(u'package_id', required=False)
def rebuild(
        verbose, force, refresh, only_missing, quiet, commit_each, package_id
):
    u''' Rebuild search index '''
    from ckan.lib.search import rebuild, commit
    try:

        rebuild(package_id,
                only_missing=only_missing,
                force=force,
                refresh=refresh,
                defer_commit=(not commit_each),
                quiet=quiet)
    except Exception as e:
        tk.error_shout(e)
    if not commit_each:
        commit()


@search_index.command(name=u'check', short_help=u'Check search index')
def check():
    from ckan.lib.search import check
    check()


@search_index.command(name=u'show', short_help=u'Show index of a dataset')
@click.argument(u'dataset_name')
def show(dataset_name):
    from ckan.lib.search import show

    index = show(dataset_name)
    click.echo(index)


@search_index.command(name=u'clear', short_help=u'Clear the search index')
@click.argument(u'dataset_name', required=False)
def clear(dataset_name):
    from ckan.lib.search import clear, clear_all

    if dataset_name:
        clear(dataset_name)
    else:
        clear_all()


def get_orphans(private = False):
    search = None
    indexed_package_ids = []
    while search is None or len(indexed_package_ids) < search['count']:
        search = logic.get_action('package_search')({}, {
                'q': '*:*',
                'fl': 'id',
                'start': len(indexed_package_ids),
                'rows': 1000,
                'include_private': private})
        indexed_package_ids += search['results']

    package_ids = {r[0] for r in model.Session.query(model.Package.id)}

    orphaned_package_ids = []

    for indexed_package_id in indexed_package_ids:
        if indexed_package_id['id'] not in package_ids:
            orphaned_package_ids.append(indexed_package_id['id'])

    return orphaned_package_ids


@search_index.command(
    name=u'list-orphans',
    short_help=u'Lists any non-existant packages in the search index'
)
@click.option(u'-p', u'--private', help=u'Include private packages',
              is_flag=True)
def list_orphans_command(private = False):
    orphaned_package_ids = get_orphans(private)
    if len(orphaned_package_ids):
        click.echo(orphaned_package_ids)
    click.echo("Found {} orphaned package(s).".format(
        len(orphaned_package_ids)
    ))


@search_index.command(
    name=u'clear-orphans',
    short_help=u'Clear any non-existant packages in the search index'
)
@click.option(u'-p', u'--private', help=u'Include private packages',
              is_flag=True)
@click.option(u'-v', u'--verbose', is_flag=True)
def clear_orphans(private = False, verbose = False):
    for orphaned_package_id in get_orphans(private):
        if verbose:
            click.echo("Clearing search index for dataset {}...".format(
                orphaned_package_id
            ))
        clear(orphaned_package_id)


@search_index.command(
    name=u'list-unindexed',
    short_help=u'Lists any missing packages from the search index'
)
def list_unindexed():
    packages = model.Session.query(model.Package.id)
    if tk.config.get_value('ckan.search.remove_deleted_packages'):
        packages = packages.filter(model.Package.state != 'deleted')

    package_ids = [r[0] for r in packages.all()]

    package_query = query_for(model.Package)
    indexed_pkg_ids = set(package_query.get_all_entity_ids(
        max_results=len(package_ids)))
    # Packages not indexed
    unindexed_package_ids = set(package_ids) - indexed_pkg_ids

    if len(unindexed_package_ids):
        click.echo(unindexed_package_ids)
    click.echo("Found {} unindexed package(s).".format(
        len(unindexed_package_ids)
    ))


@search_index.command(name=u'rebuild-fast',
                      short_help=u'Reindex with multiprocessing')
def rebuild_fast():
    from ckan.lib.search import commit

    db_url = tk.config['sqlalchemy.url']
    engine = sa.create_engine(db_url)
    package_ids = []
    result = engine.execute(u"select id from package where state = 'active';")
    for row in result:
        package_ids.append(row[0])

    def start(ids):
        from ckan.lib.search import rebuild
        rebuild(package_ids=ids)

    def chunks(l, n):
        u""" Yield n successive chunks from l."""
        newn = int(len(l) / n)
        for i in range(0, n - 1):
            yield l[i * newn:i * newn + newn]
        yield l[n * newn - newn:]

    processes = []

    try:
        for chunk in chunks(package_ids, mp.cpu_count()):
            process = mp.Process(target=start, args=(chunk,))
            processes.append(process)
            process.daemon = True
            process.start()

        for process in processes:
            process.join()
        commit()
    except Exception as e:
        click.echo(e.message)
