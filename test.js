const { default: axios } = require("axios");

const test=async ()=>{

    const response = await axios.get("https://security.gallagher.com/sitemap.xml");
    if (response.status === 200) {
        const html = response.data;
        console.log("html here for >>>",html)
    }
}
test()