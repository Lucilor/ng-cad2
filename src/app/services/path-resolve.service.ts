import {Injectable} from "@angular/core";
import {ActivatedRouteSnapshot, Params, Resolve, RouterStateSnapshot} from "@angular/router";
import {levenshtein} from "@utils";
import {routesInfo} from "../app-routing.module";

@Injectable({
  providedIn: "root"
})
export class PathResolveService implements Resolve<{path: string; queryParams: Params}> {
  constructor() {}

  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    const url = state.url.replace(/^\//, "");
    let index = -1;
    for (let i = 0; i < url.length; i++) {
      if (["#", "?"].includes(url[i])) {
        index = i;
        break;
      }
    }
    const typoPath = url.slice(0, index);
    const threshold = this.getThreshold(typoPath);
    const dictionary = routesInfo.filter(({path}) => Math.abs(path.length - typoPath.length) < threshold).map((v) => v.path);

    if (!dictionary.length) {
      return {path: "", queryParams: route.queryParams};
    }

    this.sortByDistances(typoPath, dictionary);

    return {path: `/${dictionary[0]}`, queryParams: route.queryParams};
  }

  getThreshold(path: string): number {
    if (path.length < 5) {
      return 3;
    }
    return 5;
  }

  sortByDistances(typoPath: string, dictionary: string[]) {
    const pathsDistance = {} as {[name: string]: number};

    dictionary.sort((a, b) => {
      if (!(a in pathsDistance)) {
        pathsDistance[a] = levenshtein(a, typoPath);
      }
      if (!(b in pathsDistance)) {
        pathsDistance[b] = levenshtein(b, typoPath);
      }

      return pathsDistance[a] - pathsDistance[b];
    });
  }
}
