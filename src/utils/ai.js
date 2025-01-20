async function translate(ai, text) {
    const resp = await ai.run(
        "@cf/meta/m2m100-1.2b",
        {
            text,
            source_lang: "english",
            target_lang: "chinese",
        }
    )

    return resp.translated_text
}

module.exports = {
    translate
}