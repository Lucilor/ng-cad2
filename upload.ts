import archiver from "archiver";
import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import path from "path";

const zip = async () => {
    const zipName = "upload.zip";
    const dir = "tmp";
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
    const filePath = path.join(dir, zipName);
    const output = fs.createWriteStream(filePath);
    const archive = archiver("zip");
    archive.directory("./dist", "ng-cad2");
    archive.pipe(output);
    await archive.finalize();
    return fs.createReadStream(filePath);
};

const upload = async (file: fs.ReadStream) => {
    const url = "https://www.let888.cn/n/gym/index/login/upload";
    // const url = "https://localhost/n/gym/index/login/upload";
    // process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    const data = new FormData();
    const dataObj = {dest: "static", token: "wefarvwEFqwdWEFfefw!$#^##%!", toDelete: ["ng-cad2"]};
    data.append("data", JSON.stringify(dataObj));
    data.append("file", file);
    const response = await axios.post(url, data, {headers: data.getHeaders()});
    console.log(response.data);
};

(async () => {
    await upload(await zip());
})();
