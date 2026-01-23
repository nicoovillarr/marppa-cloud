export class CustomResponse {
  private _status: number;
  private _body: any;

  constructor() {}

  status(status: number) {
    this._status = status;
    return this;
  }

  json(data: any) {
    this._body = data;
    return new Response(JSON.stringify(this._body), {
      status: this._status,
      headers: { "Content-Type": "application/json" },
    });
  }

  text(data: string) {
    this._body = data;
    return new Response(this._body, {
      status: this._status,
      headers: { "Content-Type": "text/plain" },
    });
  }

  end() {
    return new Response(null, { status: this._status });
  }
}
