export interface CmsImage {
  asset?: {
    _ref?: string;

    _type?: "reference";
  };

  crop?: {
    _type?: "sanity.imageCrop";

    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
  };

  hotspot?: {
    _type?: "sanity.imageHotspot";

    x?: number;
    y?: number;

    height?: number;
    width?: number;
  };

  alt?: string;
}
