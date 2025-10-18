#!/bin/bash

# Script to create a new release
# Usage: ./scripts/create-release.sh 1.0.2

if [ -z "$1" ]; then
    echo "Usage: $0 <version>"
    echo "Example: $0 1.0.2"
    exit 1
fi

VERSION=$1
TAG="v$VERSION"

echo "Creating release for version $VERSION..."

# Update package.json version
npm version $VERSION --no-git-tag-version

# Commit the version change
git add package.json
git commit -m "Bump version to $VERSION"

# Create and push the tag
git tag $TAG
git push origin main
git push origin $TAG

echo "✅ Release $TAG created and pushed!"
echo "🚀 GitHub Action will automatically build and create the release."
echo "📦 Check the Actions tab in your GitHub repository to monitor progress."