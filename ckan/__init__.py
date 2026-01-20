# encoding: utf-8

# (canada fork only): old namespace package
# TODO: remove after python dependency upgrades...
try:
    import pkg_resources
    # type_ignore_reason: reportAttributeAccessIssue
    pkg_resources.declare_namespace(__name__)
except ImportError:
    import pkgutil
    __path__ = pkgutil.extend_path(__path__, __name__)

__version__ = "2.10.8"

# The packaging system relies on this import, please do not remove it
# type_ignore_reason: pyright thinks it's iterable
import sys; sys.path.insert(0, __path__[0])  # type: ignore
