#!/bin/bash
set -e

if ! [ "$TRAVIS_BRANCH" == "master" ]; then
	echo "d2l-fetch.html is only updated on master"
	exit 0
fi

if ! [ "$TRAVIS_PULL_REQUEST" == "false" ]; then
	echo "d2l-fetch.html is not updated on pull requests"
	exit 0
fi

lastVersion=$(git describe --abbrev=0)
echo "Last version was" $lastVersion

versionRegex='^([0-9]+)\.([0-9]+)\.([0-9]+)$'
if ! [[ $lastVersion =~ $versionRegex ]]; then
	echo $lastVersion "is not a valid semver string according to this shitty regex"
	exit 1
fi

majorVersion=${BASH_REMATCH[1]}
minorVersion=${BASH_REMATCH[2]}
patchVersion=${BASH_REMATCH[3]}

# Uses syntax from https://github.com/Brightspace/frau-ci/blob/master/lib/travis-ci/update-version.js
logMessage=$(git log -1 --pretty=format:%s%b)
majorRegex='increment major'
patchRegex='increment patch'
commitSlug=""
if [[ $logMessage =~ $majorRegex ]]; then
	echo "Incrementing major version"
	majorVersion=$((majorVersion + 1))
	commitSlug="[increment major]"
elif [[ $logMessage =~ $patchRegex ]]; then
	echo "Incrementing patch version"
	patchVersion=$((patchVersion + 1))
	commitSlug="[increment patch]"
else
	echo "Incrementing minor version"
	minorVersion=$((minorVersion + 1))
	commitSlug="[increment minor]"
fi

newVersion="${majorVersion}.${minorVersion}.${patchVersion}"

echo "New version is" $newVersion

echo "<!-- CHANGES TO THIS FILE WILL BE LOST - IT IS AUTOMATICALLY GENERATED WHEN d2l-fetch IS RELEASED -->" > d2l-fetch.html
echo "<script src=\"https://s.brightspace.com/lib/d2lfetch/"$newVersion"/d2lfetch.js\"></script>" >> d2l-fetch.html

# Add the upstream using GH_TOKEN
git remote add upstream "https://${GH_TOKEN}@github.com/Brightspace/d2l-fetch.git"
# Pull the merge commit
git pull upstream master
# Set config so this commit shows up as coming from Travis
git config --global user.email "travis@travis-ci.com"
git config --global user.name "Travis CI"
# Add everything, commit, push
git add .
git commit -m "${commitSlug} Update d2l-fetch.html to v${newVersion} [skip ci]"
git push upstream HEAD:master
