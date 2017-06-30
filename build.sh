#!/bin/bash
rm -fv HistoryBlock.xpi && zip -r HistoryBlock.xpi historyblock.js manifest.json _locales/ icons/ libraries/ options/
