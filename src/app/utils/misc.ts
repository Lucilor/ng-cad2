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
export function RSAEncrypt(data: any, publicKey = defaultPublicKey, separator = "&&&&&") {
	const jsEncrypt = new JSEncrypt();
	jsEncrypt.setPublicKey(publicKey);
	let plainText = JSON.stringify(data);
	const limit = 63;
	const result = [];
	while (plainText.length > 0) {
		result.push(jsEncrypt.encrypt(plainText.slice(0, limit)));
		plainText = plainText.slice(limit);
	}
	return encodeURIComponent(result.join(separator));
}

export function dataURLtoBlob(dataURL: string) {
	const arr = dataURL.split(",");
	const mime = arr[0].match(/:(.*?);/)[1];
	const bstr = atob(arr[1]);
	let n = bstr.length;
	const u8arr = new Uint8Array(n);
	while (n--) {
		u8arr[n] = bstr.charCodeAt(n);
	}
	return new Blob([u8arr], {type: mime});
}
