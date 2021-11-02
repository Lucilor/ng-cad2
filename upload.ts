import archiver from "archiver";
import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import path from "path";

const zip = async (baseDir: string) => {
    const zipName = "upload.zip";
    const dir = "tmp";
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
    const filePath = path.join(dir, zipName);
    const output = fs.createWriteStream(filePath);
    const archive = archiver("zip");
    archive.glob("ng-cad2/**/*", {cwd: baseDir});
    archive.glob("ngcad2_changelog.json", {cwd: baseDir});
    archive.pipe(output);
    await archive.finalize();
    return filePath;
};

const upload = async (url: string, zipPath: string) => {
    if (url.includes("localhost")) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    }
    const data = new FormData();
    const dataObj = {dest: "static", token: "wefarvwEFqwdWEFfefw!$#^##%!", toDelete: ["ng-cad2"]};
    data.append("data", JSON.stringify(dataObj));
    data.append("file", fs.createReadStream(zipPath));
    const response = await axios.post(url, data, {headers: data.getHeaders()});
    console.log(response.data);
};

(async () => {
    const baseDir = "C:/wamp64/www/static";
    const changelogPath = path.join(baseDir, "ngcad2_changelog.json");
    const changelog = JSON.parse(fs.readFileSync(changelogPath).toString());
    changelog[0].timeStamp = new Date().getTime();
    fs.writeFileSync(changelogPath, JSON.stringify(changelog));
    const zipPath = await zip(baseDir);
    await upload("https://www.let888.cn/n/gym/index/login/upload", zipPath);
    // await upload("https://localhost/n/gym/index/login/upload", zipPath);
})();
