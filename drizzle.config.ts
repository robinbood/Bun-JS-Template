import {defineConfig} from "drizzle-kit"

export default defineConfig({
    out:"./drizzle",
    schema:"./src/DB/schema.ts",
    dialect:"postgresql",
    dbCredentials:{
        url:process.env.DATABASE_URL!
    }
})