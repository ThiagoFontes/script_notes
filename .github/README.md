# GitHub Actions Setup

This repository includes automated workflows for building and publishing the VS Code extension.

## 🤖 Automated Workflows

### 1. **Release Workflow** (`.github/workflows/release.yml`)
- **Trigger**: Automatically runs when you push a version tag (e.g., `v1.0.2`)
- **Actions**:
  - Compiles the extension
  - Runs tests
  - Packages the `.vsix` file
  - Creates a GitHub release with the packaged extension

### 2. **Publish Workflow** (`.github/workflows/publish.yml`)
- **Trigger**: Manual workflow dispatch from GitHub Actions tab
- **Actions**:
  - Option to publish to VS Code Marketplace
  - Option to publish to Open VSX Registry

## 🚀 How to Create a Release

### Option 1: Using the Helper Script
```bash
# Create and push a new release
./scripts/create-release.sh 1.0.2
```

### Option 2: Manual Process
```bash
# Update version in package.json
npm version 1.0.2 --no-git-tag-version

# Commit and tag
git add package.json
git commit -m "Bump version to 1.0.2"
git tag v1.0.2

# Push to trigger the workflow
git push origin main
git push origin v1.0.2
```

## 🔧 Setup for Marketplace Publishing (Optional)

To enable automatic publishing to marketplaces, add these secrets in your repository:

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Add the following secrets:
   - `VSCE_PAT`: Your VS Code Marketplace Personal Access Token
   - `OVSX_PAT`: Your Open VSX Registry Personal Access Token

### Getting Personal Access Tokens:

#### VS Code Marketplace (VSCE_PAT):
1. Go to [Azure DevOps](https://dev.azure.com)
2. Create a Personal Access Token with **Marketplace** → **Manage** scope

#### Open VSX Registry (OVSX_PAT):
1. Go to [Open VSX](https://open-vsx.org/)
2. Sign in and create a Personal Access Token

## 📦 Workflow Results

After pushing a tag:
1. Check the **Actions** tab to monitor progress
2. The release will appear in the **Releases** section with the `.vsix` file attached
3. Users can download and install the extension directly from GitHub

## 🎯 Publishing to Marketplaces

Use the **Publish Extension** workflow from the Actions tab:
1. Go to **Actions** → **Publish Extension**
2. Click **Run workflow**
3. Choose which marketplaces to publish to
4. Click **Run workflow**