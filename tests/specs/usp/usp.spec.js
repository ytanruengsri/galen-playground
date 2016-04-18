test("USP", function () {
    // Instantiating the WebDriver, loading the page and changing the size of the browser window
    var driver = createDriver("https://www.zalando.de/versus-versace-sneaker-high-white-ve012b00o-a11.html", "1024x768", "phantomjs");

    // Checking layout on the page
    checkLayout(driver, "tests/specs/usp/usp.spec", "desktop");

    // Quiting the browser
    driver.quit();
});
