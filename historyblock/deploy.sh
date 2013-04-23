#!/bin/bash
rm -v HistoryBlock.xpi
zip -r HistoryBlock.xpi install.rdf chrome.manifest chrome/ components/ locale/ defaults/ skin/
