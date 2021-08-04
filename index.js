//Dependencies
const DNS_Resolver = require("dns-resolver")
const Puppeteer = require("puppeteer")
const Chalk = require("chalk")
const Delay = require("delay")
const Fs = require("fs")

//Variables
const Self_Args = process.argv.slice(2)

var Scanner_Data = {}
Scanner_Data.results = ""
Scanner_Data.subdomains = null

//Main
Subdomains()
async function Subdomains(){
    console.log(`[${Chalk.blueBright("INFO")}] Scanning ${Self_Args[0]} subdomains.`)
    const browser = await Puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] })
    const page = await browser.newPage()

    await page.goto("https://subdomainfinder.c99.nl/", { waitUntil: "domcontentloaded" })
    await page.type("#domain", Self_Args[0])
    await page.click("#privatequery")
    await page.click("#scan_subdomains")
    await page.waitForSelector("body > div > div.col-md-12 > div:nth-of-type(1) > center > div.row > div > a", { timeout: 0 })
    const subdomains = await page.$$eval("#result_table > tbody > tr > td:nth-of-type(2) > a", elems =>{
        return elems.map(elem => elem.textContent)
    })

    Scanner_Data.subdomains = subdomains
    
    console.log(`[${Chalk.blueBright("INFO")}] Subdomains scanning finished..`)
    browser.close()
    Enumerating()
    return
}

function Enumerating(){
    console.log(`[${Chalk.blueBright("INFO")}] Scanning ${Self_Args[0]} subdomains DNS.`)

    var subdomain_index = 0

    Subdomains_Enumerater()
    async function Subdomains_Enumerater(){
        await Delay(100)

        if(subdomain_index > Scanner_Data.subdomains.length){
            console.log(`[${Chalk.blueBright("INFO")}] Scanning ${Self_Args[0]} subdomains DNS finished.`)
            Done()
            return
        }

        if(Scanner_Data.subdomains[subdomain_index] == undefined){
            subdomain_index += 1
            Subdomains_Enumerater()
            return
        }

        try{
            DNS_Resolver.configure(Scanner_Data.subdomains[subdomain_index], function(err, data){
                if(err){
                    subdomain_index += 1
                    Subdomains_Enumerater()
                    return
                }

                DNS_Resolver.resolve(Scanner_Data.subdomains[subdomain_index], function(err, data){
                    if(err){
                        subdomain_index += 1
                        Subdomains_Enumerater()
                        return
                    }

                    if(Scanner_Data.results.length == 0){
                        Scanner_Data.results = `${Scanner_Data.subdomains[subdomain_index]} - ${data}`
                    }else{
                        Scanner_Data.results += `\n${Scanner_Data.subdomains[subdomain_index]} - ${data}`
                    }
    
                    subdomain_index += 1
                    Subdomains_Enumerater()
                    return
                })
            })
        }catch{
            subdomain_index += 1
            Subdomains_Enumerater()
            return
        }
    }

    function Done(){
        Fs.writeFile(Self_Args[1], Scanner_Data.results, "utf8", function(err){
            if(err){
                console.log(`[${Chalk.redBright("[ERROR]")}] ${err.toString()}`)
                console.log(`[${Chalk.yellowBright("[WARNING]")}] Aborting...`)
                process.exit()
            }

            console.log(`[${Chalk.blueBright("INFO")}] Done.`)
            process.exit()
        })
    }
}
