declare module "ngeohash" {
  const ngeohash: {
    encode: (latitude: number, longitude: number, precision?: number) => string;
  };
  export default ngeohash;
}
