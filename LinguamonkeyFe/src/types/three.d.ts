declare module "three/examples/jsm/loaders/GLTFLoader" {
  import { Loader } from "three";
  import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";

  export class GLTFLoader extends Loader {
    constructor();
    setDRACOLoader(dracoLoader: DRACOLoader): void; // 👈 thêm hàm này
  }
}
