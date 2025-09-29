/*
 * This script updates the database.json file with all the MEI files in the MEI_outfiles folder.
 *
 * To run this script, use the following command: (assuming you are in the root folder of the project)
 * `node src/database/updateDatabase.mjs`
 * # or
 * `npm run database`
 */
const OWNER = "ECHOES-from-the-Past";
const REPO = "PAM-MEI-Database";
const BRANCH = "main";

// Exclude files with these strings in their file path
const EXCLUDE_FILE_PATH = ["testfiles", "intermedfiles", "template.mei"];

const targetChantlist =
  process.env.NODE_ENV === "production"
    ? "dist/database.json"
    : "src/database/database.json";

import * as fs from "fs";
import * as utils from './database-utils.mjs'

import { Chant } from "../utility/components.js";
import { Octokit } from "@octokit/core";

/**
 * Use authentication token to increase the rate limit for the GitHub API
 * For regular deployment of this project, 60 request per hour is more than enough,
 * since the deployment only occurs once in a while.
 */
const octokit = new Octokit({
  // auth: 'YOUR-TOKEN'
});

// Retrieve the directory tree
let data = await octokit.request(`GET /repos/${OWNER}/${REPO}/git/trees/${BRANCH}`, {
  owner: OWNER,
  repo: REPO,
  // tree_sha: 'main',
  accept: "application/vnd.github+json",
  headers: {
    "X-GitHub-Api-Version": "2022-11-28",
  },
  recursive: "true",
});

let allMEIfiles = data.data.tree.map((item) => {
  return item.path;
});

allMEIfiles = allMEIfiles.filter((file) => {
  const isExcluded = EXCLUDE_FILE_PATH.some((exclude) =>
    file.includes(exclude)
  );
  return file.endsWith(".mei") && !isExcluded;
});

// Get all the content of the MEI files and parse them into Chant objects
let allChants = [];

for (let fileName of allMEIfiles) {
  let meiContent = await fetch(
    `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/${fileName}`
  ).then((response) => response.text());

  let meiJSON = utils.parseMEIContentToJSON(meiContent);
  let title = utils.getChantTitle(meiJSON);
  let source = utils.getSource(meiJSON);
  let notationType = utils.getNotationType(meiJSON);
  let allSyllables = utils.getAllSyllables(meiJSON);
  let syllables = utils.parseToSyllableArray(allSyllables, notationType);

  let mode, modeCertainty, modeDescription;
  if (notationType === "aquitanian") {
    [mode, modeCertainty, modeDescription] = utils.calculateAquitanianMode(syllables);
  } else if (notationType === "square") {
    [mode, modeCertainty, modeDescription] = utils.calculateSquareMode(syllables);
  }
  let clef = utils.getClefInformation(meiJSON, notationType, modeDescription);

  let pemUrls = utils.getPEMUrls(meiJSON);
  let cantusId = utils.getCantusId(meiJSON);
  let chant = new Chant(
    meiContent,
    fileName,
    title,
    source,
    notationType,
    syllables,
    mode,
    modeCertainty,
    modeDescription,
    clef,
    pemUrls,
    cantusId
  );

  allChants.push(chant);
}

// Write all files/folder to database.json (a JSON list)
fs.writeFileSync(targetChantlist, JSON.stringify(allChants), "utf8");
