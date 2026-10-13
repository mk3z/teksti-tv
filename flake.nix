{
  description = "Teksti-TV PWA";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs =
    { nixpkgs, ... }:
    let
      forAllSystems = nixpkgs.lib.genAttrs [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];
    in
    {
      devShells = forAllSystems (
        system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
        in
        {
          default = pkgs.mkShell {
            packages = [
              pkgs.python3 # local server: python3 -m http.server
              pkgs.nodejs # node --test, node --check
              pkgs.librsvg # rsvg-convert: icon.svg -> PNG icons
            ];
          };
        }
      );
    };
}
