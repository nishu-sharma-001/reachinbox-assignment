import "dotenv/config";
import elasticsearch from "./elasticsearch";

async function testElastic() {
  const response = await elasticsearch.info();

  console.log("Elasticsearch connected successfully!");
  console.log(response);
}

testElastic().catch((error) => {
  console.error("Elasticsearch connection failed:", error);
});