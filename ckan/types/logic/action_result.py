# -*- coding: utf-8 -*-
from __future__ import annotations

# (canada fork only): TypedDict sub-classes for action results
# TODO: upstream contrib!!!
from typing import (
    Any, List, Optional, Tuple, Union, Dict, Any
)
# (canada fork only): TypedDict sub-classes for action results
# TODO: upstream contrib!!!
from typing_extensions import TypeAlias, TypedDict, Required
# (canada fork only): TypedDict sub-classes for action results
# TODO: upstream contrib!!!
from sqlalchemy.types import DateTime

from ..model import Query, Model

AnyDict: TypeAlias = "dict[str, Any]"
###############################################################################
#                                     get                                     #
###############################################################################
PackageList = List[str]
CurrentPackageListWithResources = List[AnyDict]
MemberList = List[Tuple[Any, ...]]
PackageCollaboratorList = List[AnyDict]
PackageCollaboratorListForUser = PackageCollaboratorList
GroupList = List[AnyDict]
OrganizationList = List[AnyDict]
GroupListAuthz = List[AnyDict]
OrganizationListForUser = List[AnyDict]
LicenseList = List[AnyDict]
TagList = Union[List[AnyDict], List[str]]
UserList = Union[List[AnyDict], List[str], "Query[Model.User]"]
PackageRelationshipsList = List[AnyDict]
PackageShow = AnyDict
ResourceShow = AnyDict
ResourceViewShow = AnyDict
ResourceViewList = List[AnyDict]
GroupShow = AnyDict
OrganizationShow = AnyDict
GroupPackageShow = List[AnyDict]
TagShow = AnyDict
UserShow = AnyDict
PackageAutocomplete = List[AnyDict]
FormatAutocomplete = List[str]
UserAutocomplete = List[AnyDict]
GroupAutocomplete = List[AnyDict]
OrganizationAutocomplete = List[AnyDict]
PackageSearch = AnyDict
ResourceSearch = AnyDict
TagSearch = AnyDict
TagAutocomplete = List[str]
TaskStatusShow = AnyDict
TermTranslationShow = List[AnyDict]
GetSiteUser = AnyDict
StatusShow = AnyDict
VocabularyList = List[AnyDict]
VocabularyShow = AnyDict
UserFollowerCount = int
DatasetFollowerCount = int
GroupFollowerCount = int
OrganizationFollowerCount = int
UserFollowerList = List[AnyDict]
DatasetFollowerList = List[AnyDict]
GroupFollowerList = List[AnyDict]
OrganizationFollowerList = List[AnyDict]
AmFollowingUser = bool
AmFollowingDataset = bool
AmFollowingGroup = bool
FolloweeCount = int
UserFolloweeCount = int
DatasetFolloweeCount = int
GroupFolloweeCount = int
OrganizationFolloweeCount = int
FolloweeList = List[AnyDict]
UserFolloweeList = List[AnyDict]
DatasetFolloweeList = List[AnyDict]
GroupFolloweeList = List[AnyDict]
OrganizationFolloweeList = List[AnyDict]
DashboardNewActivitiesCount = int
MemberRolesList = List[AnyDict]
HelpShow = Optional[str]
ConfigOptionShow = Any
ConfigOptionList = List[str]
JobList = Union[List[AnyDict], List[str]]  # (canada fork only): can return list of job IDs
JobShow = AnyDict
ApiTokenList = List[AnyDict]

# (canada fork only): TypedDict sub-classes for action results
# TODO: upstream contrib!!!
class ExtrasDict(TypedDict, total=False):
    '''
    Dictionary for object extras.

    see: ckan.logic.schema.default_tags_schema
    '''
    id: str
    key: Required[str]
    value: Required[Any]
    state: str
    deleted: bool
    revision_timestamp: DateTime


class TagDict(TypedDict, total=False):
    '''
    Dictionary for tags.

    see: ckan.logic.schema.default_tags_schema
    '''
    name: Required[str]
    vocabulary_id: str
    revision_timestamp: DateTime
    state: str
    display_name: str


class TrackingSummaryDict(TypedDict):
    '''
    Dictionary for tracking summaries.

    see: ckan.model.tracking:TrackingSummary
    '''
    total: int
    recent: int


class ResourceShowDict(TypedDict, total=False):
    '''
    Dictionary returned from the resource_show action.

    see: ckan.logic.schema.default_show_package_schema
    '''
    id: Required[str]
    package_id: Required[str]
    url: str
    description: str
    format: str
    hash: str
    state: str
    position: int
    name: str
    resource_type: str
    url_type: str
    mimetype: str
    mimetype_inner: str
    cache_url: str
    size: int
    created: Required[DateTime]
    last_modified: DateTime
    metadata_modified: DateTime
    cache_last_updated: DateTime
    datastore_active: bool
    tracking_summary: TrackingSummaryDict


class PackageShowDict(TypedDict, total=False):
    '''
    Dictionary returned from the package_show action.

    see: ckan.logic.schema.default_show_package_schema
    '''
    id: Required[str]
    name: Optional[str]
    title: str
    notes: str
    type: str
    url: str
    version: str
    metadata_created: Required[DateTime]
    metadata_modified: DateTime
    plugin_data: Dict[str, Any]
    private: bool
    state: str
    isopen: bool
    license_url: str
    creator_user_id: str
    author: str
    author_email: str
    maintainer: str
    maintainer_email: str
    license_id: str
    license_title: str
    tracking_summary: TrackingSummaryDict
    owner_org: str
    organization: OrganizationShowDict
    resources: List[ResourceShowDict]
    num_resources: int
    tags: List[TagDict]
    tag_string: str
    num_tags: int


class GroupPackageDict(TypedDict, total=False):
    '''
    Dictionary part of a group's packages.

    see: ckan.logic.schema.default_group_schema
    '''
    id: Required[str]
    title: str
    name: str


class GroupMemberDict(TypedDict, total=False):
    '''
    Dictionary part of a group's users and groups.

    see: ckan.logic.schema.default_group_schema
    '''
    name: Required[str]
    capacity: str


class OrganizationShowDict(TypedDict, total=False):
    '''
    Dictionary returned from the organization_show action.

    see: ckan.logic.schema.default_show_group_schema
    '''
    id: Required[str]
    name: Required[str]
    title: str
    description: str
    image_url: str
    image_display_url: str
    type: str
    state: str
    created: DateTime
    is_organization: bool
    approval_status: str
    extras: List[ExtrasDict]
    packages: List[GroupPackageDict]
    users: List[GroupMemberDict]
    groups: List[GroupMemberDict]
    num_followers: int
    display_name: str
    package_count: int


###############################################################################
#                                    create                                   #
###############################################################################
PackageCreate = Union[AnyDict, str]
ResourceCreate = AnyDict
ResourceViewCreate = AnyDict
ResourceCreateDefaultResourceViews = List[AnyDict]
PackageCreateDefaultResourceViews = List[AnyDict]
PackageRelationshipCreate = AnyDict
MemberCreate = AnyDict
PackageCollaboratorCreate = AnyDict
GroupCreate = Union[str, AnyDict]
OrganizationCreate = Union[str, AnyDict]
UserCreate = AnyDict
UserInvite = AnyDict
VocabularyCreate = AnyDict
TagCreate = AnyDict
FollowUser = AnyDict
FollowDataset = AnyDict
GroupOrOrgMemberCreate = AnyDict
GroupMemberCreate = AnyDict
OrganizationMemberCreate = AnyDict
FollowGroup = AnyDict
ApiTokenCreate = AnyDict

###############################################################################
#                                    delete                                   #
###############################################################################
UserDelete: TypeAlias = None
PackageDelete: TypeAlias = None
DatasetPurge: TypeAlias = None
ResourceDelete: TypeAlias = None
ResourceViewDelete: TypeAlias = None
ResourceViewClear: TypeAlias = None
PackageRelationshipDelete: TypeAlias = None
MemberDelete: TypeAlias = None
PackageCollaboratorDelete: TypeAlias = None
GroupDelete: TypeAlias = None
OrganizationDelete: TypeAlias = None
ApiTokenRevoke: TypeAlias = None

###############################################################################
#                                    patch                                    #
###############################################################################
PackagePatch = Union[str, AnyDict]
ResourcePatch = AnyDict
GroupPatch = AnyDict
OrganizationPatch = AnyDict
UserPatch = AnyDict

###############################################################################
#                                    update                                   #
###############################################################################
ResourceUpdate = AnyDict
ResourceViewUpdate = AnyDict
ResourceViewReorder = AnyDict
PackageUpdate = Union[str, AnyDict]
ConfigOptionUpdate = AnyDict
PackageRevise = AnyDict
PackageResourceReorder = AnyDict
PackageRelationshipUpdate = AnyDict
GroupUpdate = AnyDict
OrganizationUpdate = AnyDict
UserUpdate = AnyDict
UserGenerateApikey = AnyDict
TaskStatusUpdate = AnyDict
TaskStatusUpdateMany = AnyDict
TermTranslationUpdate = AnyDict
TermTranslationUpdateMany = AnyDict
VocabularyUpdate = AnyDict
DashboardMarkActivitiesOld: TypeAlias = None
SendEmailNotifications: TypeAlias = None
PackageOwnerOrgUpdate: TypeAlias = None
BulkUpdatePrivate: TypeAlias = None
BulkUpdatePublic: TypeAlias = None
BulkUpdateDelete: TypeAlias = None
