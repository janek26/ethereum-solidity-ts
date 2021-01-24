export default function main(fn: () => Promise<any>): void {
  fn()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error)
      process.exit(1)
    })
}
