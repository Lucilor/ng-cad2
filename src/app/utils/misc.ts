import JSEncrypt from "jsencrypt";

const defaultPublicKey = `
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAzDn9P27uGK+wuoO2AG7j
7vHQtN93Q0zxfbeQlBYVTEe0BZ4MXg10xGab/NBHqLQxLyQf1QOwYYQTzVS/ajje
ItFGUqQsAuZMUqxW9vL/Xk7QMLCbseOyEb82mOZ/DZXij1zEjaqVhonV5W8n6VVJ
5RO6Vk/EZ2gcGEELGwqQOb2ItVjINLDZLzV9Sb+VXxZiv/eYfvcqAYGuOTgRsjVG
Ys+u2YRp2VGNaNcLbd+Z3AsAZiCqzZR5H0cJnySg6axHEKa1I5RIGFVmCHBONv5x
ZyOT2GCZPEv6TnMvmWLpIk9QpjrSEkn5E11YlCN9g5ekk31RbVdb9GkxNzz8iLzM
VwIDAQAB
-----END PUBLIC KEY-----
`;
export const RSAEncrypt = (data: any, publicKey = defaultPublicKey, separator = "&&&&&") => {
    const jsEncrypt = new JSEncrypt();
    jsEncrypt.setPublicKey(publicKey);
    let plainText = JSON.stringify(data);
    if (!plainText) {
        return "";
    }
    const limit = 63;
    const result = [];
    while (plainText.length > 0) {
        result.push(jsEncrypt.encrypt(plainText.slice(0, limit)));
        plainText = plainText.slice(limit);
    }
    return encodeURIComponent(result.join(separator));
};

export const dataURLtoBlob = (dataURL: string) => {
    const arr = dataURL.split(",");
    const mime = arr[0].match(/:(.*?);/)?.[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], {type: mime});
};

export const getDPI = () => {
    const result = Array<number>();
    const tmpNode = document.createElement("div");
    tmpNode.style.cssText = "width:1in;height:1in;position:absolute;left:0px;top:0px;z-index:99;visibility:hidden";
    document.body.appendChild(tmpNode);
    result[0] = tmpNode.offsetWidth;
    result[1] = tmpNode.offsetHeight;
    tmpNode.remove();
    return result;
};

export const copyToClipboard = (str: string) => {
    const el = document.createElement("textarea");
    el.value = str;
    el.setAttribute("readonly", "");
    el.style.position = "absolute";
    el.style.opacity = "0";
    document.body.appendChild(el);
    el.select();
    document.execCommand("copy");
    document.body.removeChild(el);
};

export const downloadByString = (content: string, filename: string) => {
    const blob = new Blob([content]);
    const url = URL.createObjectURL(blob);
    downloadByUrl(url, filename);
    URL.revokeObjectURL(url);
};

export const downloadByUrl = (url: string, filename = "") => {
    const link = document.createElement("a");
    link.download = filename;
    link.style.display = "none";
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const timeout = <T>(time = 0, value?: T) => new Promise<T | undefined>((resolve) => setTimeout(() => resolve(value), time));
